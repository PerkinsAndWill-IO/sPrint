import type { ApsManifest, ApsManifestChild, ApsManifestDerivative, Derivative, DerivativeFormat, ViewSet } from '~/types/derivatives'

export interface ManifestResponse {
  modelName: string
  derivatives: Derivative[]
  viewSets: ViewSet[]
  revitVersionSupported: boolean
  revitVersion: number | null
}

export function emptyManifestResponse(): ManifestResponse {
  return {
    modelName: 'Unknown',
    derivatives: [],
    viewSets: [],
    revitVersionSupported: false,
    revitVersion: null
  }
}

/**
 * Turns a raw APS manifest into the API response. Defensive: a missing,
 * empty, or malformed manifest yields an empty response (the UI renders
 * its "no published print sets" state) instead of throwing.
 */
export function normalizeManifestResponse(manifest: ApsManifest | null | undefined): ManifestResponse {
  if (!manifest) return emptyManifestResponse()
  if (!Array.isArray(manifest.derivatives)) {
    console.warn('[manifest] Malformed manifest: derivatives is not an array')
    return emptyManifestResponse()
  }

  const firstDerivative = manifest.derivatives[0]
  if (!firstDerivative || typeof firstDerivative !== 'object') {
    // Valid condition: nothing published for this model yet
    return emptyManifestResponse()
  }
  if (firstDerivative.children !== undefined && !Array.isArray(firstDerivative.children)) {
    console.warn('[manifest] Malformed manifest: derivative children is not an array')
  }

  const derivatives = filterDerivatives(firstDerivative.children)
  const viewSets = extractViewSets(derivatives)
  const { supported: revitVersionSupported, version: revitVersion } = checkRevitVersion(firstDerivative)

  return {
    modelName: firstDerivative.name || 'Unknown',
    derivatives,
    viewSets,
    revitVersionSupported,
    revitVersion
  }
}

function normalizeViewSets(viewSets: string | string[] | undefined): string[] {
  if (!viewSets) return []
  return Array.isArray(viewSets) ? viewSets : [viewSets]
}

export function resolveFormat(child: ApsManifestChild): DerivativeFormat {
  const role = child.role?.toLowerCase() || ''
  const urn = (child.urn || '').toLowerCase()
  const name = urn.split('/').pop() || ''

  if (role === 'pdf-page' || urn.endsWith('.pdf')) return 'pdf'
  if (role === 'thumbnail') return 'thumbnail'
  if (name === 'aecmodeldata.json') return 'aec'
  if (urn.endsWith('.sdb') || name === 'model.sdb') return 'sdb'
  if (urn.endsWith('.svf') || urn.endsWith('.svf2')) return 'svf'
  if (urn.endsWith('.dwg')) return 'dwg'
  if (urn.endsWith('.dwf') || urn.endsWith('.dwfx')) return 'dwf'
  if (urn.endsWith('.ifc')) return 'ifc'
  return 'other'
}

export function resolveMimeType(format: DerivativeFormat): string {
  const map: Record<DerivativeFormat, string> = {
    pdf: 'application/pdf',
    dwg: 'application/acad',
    dwf: 'model/vnd.dwf',
    ifc: 'application/x-step',
    thumbnail: 'image/png',
    aec: 'application/json',
    sdb: 'application/octet-stream',
    svf: 'application/octet-stream',
    other: 'application/octet-stream'
  }
  return map[format]
}

export function filterDerivatives(children: ApsManifestChild[] | null | undefined, formats?: DerivativeFormat[]): Derivative[] {
  const result: Derivative[] = []
  if (!Array.isArray(children)) return result

  for (const child of children) {
    if (!child || typeof child !== 'object') continue
    const subChildren = Array.isArray(child.children) ? child.children.filter(c => c && typeof c === 'object') : []

    // Check for pdf-page sub-children (existing pattern)
    const pdfChild = subChildren.find(c => c.role === 'pdf-page')
    if (pdfChild) {
      const format: DerivativeFormat = 'pdf'
      if (formats && !formats.includes(format)) continue
      result.push({
        guid: pdfChild.guid,
        name: child.name || pdfChild.urn?.split('/').pop() || pdfChild.name,
        urn: pdfChild.urn || '',
        format,
        mimeType: resolveMimeType(format),
        viewSets: normalizeViewSets(child.ViewSets),
        active: true
      })
      continue
    }

    // Check the child itself for other derivative types
    if (child.urn) {
      const format = resolveFormat(child)
      if (format === 'pdf') continue // PDFs are handled via pdf-page children above
      if (formats && !formats.includes(format)) continue
      result.push({
        guid: child.guid,
        name: child.urn.split('/').pop() || child.name,
        urn: child.urn,
        format,
        mimeType: resolveMimeType(format),
        viewSets: normalizeViewSets(child.ViewSets),
        active: false // Only PDFs are active by default (handled above)
      })
    }

    // Recurse into children for nested derivatives (non-pdf-page)
    if (subChildren.length > 0) {
      for (const sub of subChildren) {
        if (sub.role === 'pdf-page') continue // Already handled
        if (!sub.urn) continue
        const format = resolveFormat(sub)
        if (formats && !formats.includes(format)) continue
        result.push({
          guid: sub.guid,
          name: sub.urn.split('/').pop() || sub.name,
          urn: sub.urn,
          format,
          mimeType: resolveMimeType(format),
          viewSets: normalizeViewSets(child.ViewSets),
          active: format === 'pdf'
        })
      }
    }
  }

  return result
}

/** @deprecated Use filterDerivatives instead */
export const filterPdfDerivatives = (children: ApsManifestChild[]) => filterDerivatives(children, ['pdf'])

export function extractViewSets(derivatives: Derivative[]): ViewSet[] {
  const names = new Set<string>()
  for (const d of derivatives) {
    for (const vs of d.viewSets) {
      names.add(vs)
    }
  }
  return Array.from(names).map(name => ({ name, active: true }))
}

/** @deprecated Use extractViewSets instead */
export const extractPdfViewSets = extractViewSets

export function groupDerivativesByViewSet(derivatives: Derivative[]): Map<string, Derivative[]> {
  const groups = new Map<string, Derivative[]>()
  for (const d of derivatives) {
    for (const vs of d.viewSets) {
      if (!groups.has(vs)) groups.set(vs, [])
      groups.get(vs)!.push(d)
    }
  }
  return groups
}

export function checkRevitVersion(derivative: ApsManifestDerivative): { supported: boolean, version: number | null } {
  const versionStr = derivative.properties?.['Document Information']?.RVTVersion
  if (!versionStr) return { supported: false, version: null }
  const version = parseInt(versionStr)
  return { supported: version >= 2022, version }
}
