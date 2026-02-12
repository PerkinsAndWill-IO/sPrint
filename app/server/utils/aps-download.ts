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
    if (match) {
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
  return parts[parts.length - 1] || 'unknown.pdf'
}

export async function getSignedDerivativeUrl(urn: string, derivativeUrn: string, token: string): Promise<SignedCookieInfo> {
  const encodedDerivativeUrn = encodeURIComponent(derivativeUrn)
  const url = `${APS_BASE_URL}/modelderivative/v2/designdata/${urn}/manifest/${encodedDerivativeUrn}/signedcookies?useCdn=true`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to get signed cookies for ${derivativeUrn}: ${response.status}`)
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
    throw new Error(`Failed to download derivative: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return {
    name: deriveFileName(derivativeUrn),
    data: Buffer.from(arrayBuffer)
  }
}

export async function downloadAllDerivatives(urn: string, derivativeUrns: string[], token: string): Promise<DerivativeFile[]> {
  return Promise.all(
    derivativeUrns.map(async (derivativeUrn) => {
      const signedInfo = await getSignedDerivativeUrl(urn, derivativeUrn, token)
      return downloadDerivative(signedInfo, derivativeUrn)
    })
  )
}

interface FileGroup {
  urn: string
  derivatives: string[]
  name?: string
}

interface ExportBody {
  urn?: string
  derivatives?: string[]
  files?: FileGroup[]
  options?: { mergePdfs?: boolean, zipOutput?: boolean }
}

export interface ParsedExportOptions {
  mergePdfs: boolean
  zipOutput: boolean
}

export function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'unknown'
}

export function parseExportBody(body: ExportBody): { fileGroups: FileGroup[], options: ParsedExportOptions } | { error: string } {
  const options: ParsedExportOptions = {
    mergePdfs: body.options?.mergePdfs ?? false,
    zipOutput: body.options?.zipOutput ?? true
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
