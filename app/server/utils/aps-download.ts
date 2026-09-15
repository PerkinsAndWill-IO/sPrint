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

export interface DerivativeStream {
  stream: ReadableStream<Uint8Array>
  status: number
  headers: Record<string, string>
}

/** Time allowed for an upstream to answer with response headers (not body). */
const UPSTREAM_HEADERS_TIMEOUT_MS = 30_000

/**
 * Builds an RFC 6266 / RFC 5987 Content-Disposition value. Node rejects header
 * values containing characters outside Latin-1, so a display name such as
 * "A.400-01 – PLAN" (en dash) would otherwise throw ERR_INVALID_CHAR. The ASCII
 * fallback keeps legacy clients working; `filename*` carries the exact UTF-8 name.
 */
export function buildContentDisposition(type: 'inline' | 'attachment', name: string): string {
  const cleaned = name.replace(/[\r\n"\\]/g, '').trim() || 'download'
  const ascii = cleaned.replace(/[^\x20-\x7E]/g, '_')
  if (ascii === cleaned) {
    return `${type}; filename="${ascii}"`
  }
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`
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

function sanitizeFsName(name: string): string {
  return name.replace(/[/\\:*?"<>|\r\n]/g, '_').trim()
}

function extractUrnExtension(urn: string): string {
  const last = urn.split('/').pop() || ''
  const m = last.match(/\.[a-zA-Z0-9]{1,8}$/)
  return m ? m[0] : ''
}

export function deriveFileName(derivativeUrn: string, displayName?: string): string {
  if (displayName) {
    const sanitized = sanitizeFsName(displayName)
    if (sanitized) {
      const ext = extractUrnExtension(derivativeUrn)
      if (ext && !sanitized.toLowerCase().endsWith(ext.toLowerCase())) {
        return sanitized + ext
      }
      return sanitized
    }
  }
  const parts = derivativeUrn.split('/')
  const raw = parts[parts.length - 1] || 'unknown'
  const sanitized = raw.replace(/[\r\n"\\]/g, '').trim()
  return sanitized || 'unknown'
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
    },
    signal: AbortSignal.timeout(UPSTREAM_HEADERS_TIMEOUT_MS)
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

export async function downloadDerivative(signedInfo: SignedCookieInfo, derivativeUrn: string, displayName?: string): Promise<DerivativeFile> {
  const downloadUrl = buildCloudFrontUrl(signedInfo.url, signedInfo.policy, signedInfo.keyPairId, signedInfo.signature)

  const response = await fetch(downloadUrl)
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to download derivative: ${response.status} ${body}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return {
    name: deriveFileName(derivativeUrn, displayName),
    data: Buffer.from(arrayBuffer)
  }
}

const FORWARDED_UPSTREAM_HEADERS = ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'] as const

/**
 * Opens the derivative as a stream instead of buffering it. Used by the single
 * derivative endpoint so large sheets flow straight to the browser. The optional
 * Range header is forwarded so PDF viewers can fetch pages progressively.
 */
export async function openDerivativeStream(signedInfo: SignedCookieInfo, range?: string): Promise<DerivativeStream> {
  const downloadUrl = buildCloudFrontUrl(signedInfo.url, signedInfo.policy, signedInfo.keyPairId, signedInfo.signature)

  const response = await fetch(downloadUrl, {
    headers: range ? { Range: range } : {},
    signal: AbortSignal.timeout(UPSTREAM_HEADERS_TIMEOUT_MS)
  })
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to download derivative: ${response.status} ${body}`)
  }

  const headers: Record<string, string> = {}
  for (const h of FORWARDED_UPSTREAM_HEADERS) {
    const v = response.headers.get(h)
    if (v) headers[h] = v
  }

  return { stream: response.body, status: response.status, headers }
}

export interface DerivativeRef {
  urn: string
  name?: string
}

export async function downloadAllDerivatives(urn: string, derivatives: DerivativeRef[], token: string, region?: string): Promise<DerivativeFile[]> {
  return Promise.all(
    derivatives.map(async (d) => {
      const signedInfo = await getSignedDerivativeUrl(urn, d.urn, token, region)
      return downloadDerivative(signedInfo, d.urn, d.name)
    })
  )
}

interface FileGroup {
  urn: string
  derivatives: DerivativeRef[]
  name?: string
}

const MERGE_SCOPES = ['none', 'per-model', 'all'] as const

type DerivativeInput = string | { urn: string, name?: string }

interface ExportBodyFileGroup {
  urn: string
  derivatives: DerivativeInput[]
  name?: string
}

interface ExportBody {
  urn?: string
  derivatives?: DerivativeInput[]
  files?: ExportBodyFileGroup[]
  options?: { mergeScope?: string, zip?: boolean, modelFolders?: boolean }
}

function normalizeDerivative(input: DerivativeInput): DerivativeRef | null {
  if (typeof input === 'string') {
    return input ? { urn: input } : null
  }
  if (input && typeof input === 'object' && typeof input.urn === 'string' && input.urn) {
    return typeof input.name === 'string' && input.name ? { urn: input.urn, name: input.name } : { urn: input.urn }
  }
  return null
}

export interface ParsedExportOptions {
  mergeScope: 'none' | 'per-model' | 'all'
  zip: boolean
  modelFolders: boolean
}

export function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'unknown'
}

const MAX_FILE_GROUPS = 50
const MAX_DERIVATIVES_PER_GROUP = 200

export function parseExportBody(body: ExportBody): { fileGroups: FileGroup[], options: ParsedExportOptions } | { error: string } {
  const rawMerge = body.options?.mergeScope
  const options: ParsedExportOptions = {
    mergeScope: (MERGE_SCOPES as readonly string[]).includes(rawMerge as string) ? rawMerge as ParsedExportOptions['mergeScope'] : 'none',
    zip: body.options?.zip !== undefined ? Boolean(body.options.zip) : true,
    modelFolders: body.options?.modelFolders !== undefined ? Boolean(body.options.modelFolders) : true
  }

  if (body.files && Array.isArray(body.files)) {
    if (body.files.length === 0) return { error: 'files must be a non-empty array' }
    if (body.files.length > MAX_FILE_GROUPS) return { error: `Too many file groups (max ${MAX_FILE_GROUPS})` }
    const normalizedGroups: FileGroup[] = []
    for (const group of body.files) {
      if (!group.urn) return { error: 'Each file must have a urn' }
      if (!group.derivatives || !Array.isArray(group.derivatives) || group.derivatives.length === 0) {
        return { error: 'Each file must have a non-empty derivatives array' }
      }
      if (group.derivatives.length > MAX_DERIVATIVES_PER_GROUP) {
        return { error: `Too many derivatives per file (max ${MAX_DERIVATIVES_PER_GROUP})` }
      }
      const normalized = group.derivatives.map(normalizeDerivative).filter((d): d is DerivativeRef => d !== null)
      if (normalized.length === 0) {
        return { error: 'Each file must have a non-empty derivatives array' }
      }
      normalizedGroups.push({ urn: group.urn, derivatives: normalized, name: group.name })
    }
    return { fileGroups: normalizedGroups, options }
  }

  if (!body.urn) return { error: 'urn is required' }
  if (!body.derivatives || !Array.isArray(body.derivatives) || body.derivatives.length === 0) {
    return { error: 'derivatives must be a non-empty array' }
  }
  if (body.derivatives.length > MAX_DERIVATIVES_PER_GROUP) {
    return { error: `Too many derivatives per file (max ${MAX_DERIVATIVES_PER_GROUP})` }
  }
  const normalized = body.derivatives.map(normalizeDerivative).filter((d): d is DerivativeRef => d !== null)
  if (normalized.length === 0) {
    return { error: 'derivatives must be a non-empty array' }
  }
  return { fileGroups: [{ urn: body.urn, derivatives: normalized }], options }
}
