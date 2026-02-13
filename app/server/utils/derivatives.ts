import type { ApsManifestChild, ApsManifestDerivative, PdfDerivative, PdfViewSet } from '~/types/derivatives'

function normalizeViewSets(viewSets: string | string[] | undefined): string[] {
  if (!viewSets) return []
  return Array.isArray(viewSets) ? viewSets : [viewSets]
}

export function filterPdfDerivatives(children: ApsManifestChild[]): PdfDerivative[] {
  const result: PdfDerivative[] = []

  for (const child of children) {
    const pdfChild = child.children?.find(c => c.role === 'pdf-page')
    if (!pdfChild) continue

    result.push({
      guid: pdfChild.guid,
      name: pdfChild.urn ? pdfChild.urn.split('/').pop()! : pdfChild.name,
      urn: pdfChild.urn || '',
      viewSets: normalizeViewSets(child.ViewSets),
      active: true
    })
  }

  return result
}

export function extractPdfViewSets(derivatives: PdfDerivative[]): PdfViewSet[] {
  const names = new Set<string>()
  for (const d of derivatives) {
    for (const vs of d.viewSets) {
      names.add(vs)
    }
  }
  return Array.from(names).map(name => ({ name, active: true }))
}

export function groupDerivativesByViewSet(derivatives: PdfDerivative[]): Map<string, PdfDerivative[]> {
  const groups = new Map<string, PdfDerivative[]>()
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
