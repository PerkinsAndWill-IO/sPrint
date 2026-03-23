const APS_BASE_URL = 'https://developer.api.autodesk.com'

interface SignedCookieInfo {
  url: string
  policy: string
  keyPairId: string
  signature: string
}

interface DerivativeFile {
  name: string
  data: Buffer
}

export function parseSignedCookies(cookieHeader: string): { policy: string, keyPairId: string, signature: string } {
  const cookies: Record<string, string> = {}
  for (const part of cookieHeader.split(',')) {
    const match = part.match(/([^=]+)=([^;]+)/)
    if (match?.[1] && match[2]) {
      cookies[match[1].trim()] = match[2].trim()
    }
  }
  return {
    policy: cookies['CloudFront-Policy'] || '',
    keyPairId: cookies['CloudFront-Key-Pair-Id'] || '',
    signature: cookies['CloudFront-Signature'] || ''
  }
}

export function buildCloudFrontUrl(url: string, policy: string, keyPairId: string, signature: string): string {
  return `${url}?Policy=${policy}&Key-Pair-Id=${keyPairId}&Signature=${signature}`
}

export function deriveFileName(derivativeUrn: string): string {
  const parts = derivativeUrn.split('/')
  return parts[parts.length - 1] || 'unknown'
}

export function inferMimeType(urn: string): string {
  const lower = urn.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.json')) return 'application/json'
  if (lower.endsWith('.dwg')) return 'application/acad'
  if (lower.endsWith('.dwf') || lower.endsWith('.dwfx')) return 'model/vnd.dwf'
  if (lower.endsWith('.ifc')) return 'application/x-step'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

export async function getSignedDerivativeUrl(urn: string, derivativeUrn: string, token: string, region?: string): Promise<SignedCookieInfo> {
  const encodedDerivativeUrn = encodeURIComponent(derivativeUrn)
  const basePath = `/modelderivative/v2/designdata/${urn}/manifest/${encodedDerivativeUrn}/signedcookies?useCdn=true`
  const url = `${APS_BASE_URL}${modelDerivativePath(basePath, region)}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...regionHeader(region)
    }
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to get signed cookies for ${derivativeUrn}: ${response.status} ${body}`)
  }

  const cookieHeader = response.headers.get('set-cookie') || ''
  const { policy, keyPairId, signature } = parseSignedCookies(cookieHeader)
  const body = await response.json() as { url: string }

  return { url: body.url, policy, keyPairId, signature }
}

export async function downloadDerivative(signedInfo: SignedCookieInfo, derivativeUrn: string): Promise<DerivativeFile> {
  const downloadUrl = buildCloudFrontUrl(signedInfo.url, signedInfo.policy, signedInfo.keyPairId, signedInfo.signature)

  const response = await fetch(downloadUrl)
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to download derivative: ${response.status} ${body}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return {
    name: deriveFileName(derivativeUrn),
    data: Buffer.from(arrayBuffer)
  }
}

export async function downloadAllDerivatives(urn: string, derivativeUrns: string[], token: string, region?: string): Promise<DerivativeFile[]> {
  return Promise.all(
    derivativeUrns.map(async (derivativeUrn) => {
      const signedInfo = await getSignedDerivativeUrl(urn, derivativeUrn, token, region)
      return downloadDerivative(signedInfo, derivativeUrn)
    })
  )
}

interface FileGroup {
  urn: string
  derivatives: string[]
  name?: string
}

const MERGE_SCOPES = ['none', 'per-model', 'all'] as const

interface ExportBody {
  urn?: string
  derivatives?: string[]
  files?: FileGroup[]
  options?: { mergeScope?: string, zip?: boolean, modelFolders?: boolean }
}

export interface ParsedExportOptions {
  mergeScope: 'none' | 'per-model' | 'all'
  zip: boolean
  modelFolders: boolean
}

export function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'unknown'
}

export function parseExportBody(body: ExportBody): { fileGroups: FileGroup[], options: ParsedExportOptions } | { error: string } {
  const rawMerge = body.options?.mergeScope
  const options: ParsedExportOptions = {
    mergeScope: (MERGE_SCOPES as readonly string[]).includes(rawMerge as string) ? rawMerge as ParsedExportOptions['mergeScope'] : 'none',
    zip: body.options?.zip !== undefined ? Boolean(body.options.zip) : true,
    modelFolders: body.options?.modelFolders !== undefined ? Boolean(body.options.modelFolders) : true
  }

  if (body.files && Array.isArray(body.files)) {
    if (body.files.length === 0) return { error: 'files must be a non-empty array' }
    for (const group of body.files) {
      if (!group.urn) return { error: 'Each file must have a urn' }
      if (!group.derivatives || !Array.isArray(group.derivatives) || group.derivatives.length === 0) {
        return { error: 'Each file must have a non-empty derivatives array' }
      }
    }
    return { fileGroups: body.files, options }
  }

  if (!body.urn) return { error: 'urn is required' }
  if (!body.derivatives || !Array.isArray(body.derivatives) || body.derivatives.length === 0) {
    return { error: 'derivatives must be a non-empty array' }
  }
  return { fileGroups: [{ urn: body.urn, derivatives: body.derivatives }], options }
}
