/**
 * Safety net that runs on every log line, exception and event before it
 * leaves the process. Call sites should never pass secrets in the first
 * place; this catches the ones that slip through (an APS error body that
 * echoes a token, a URL with a signed query string, an email in a message).
 */

export const REDACTED = '[redacted]'

const MAX_DEPTH = 6
const MAX_STRING = 2000
const MAX_ARRAY = 50

// Compared after lowercasing and dropping non-alphanumerics, so
// `refresh_token`, `refreshToken` and `Refresh-Token` all match.
const SENSITIVE_KEYS = new Set([
  'code', 'authcode', 'state',
  'policy', 'keypairid', 'cloudfrontpolicy', 'cloudfrontkeypairid',
  'apikey', 'clientsecret', 'credentials',
  'email', 'emailid'
])
const SENSITIVE_KEY_PARTS = ['token', 'secret', 'password', 'cookie', 'authorization', 'signature']

const SENSITIVE_QUERY_PARAMS = 'code|state|token|access_token|refresh_token|id_token|client_secret|signature|policy|key-pair-id|x-amz-signature|x-amz-credential|x-amz-security-token'

const STRING_RULES: Array<[RegExp, string]> = [
  [/\b(Bearer|Basic)\s+[\w\-.~+/]+=*/gi, `$1 ${REDACTED}`],
  [/eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]{5,}/g, REDACTED],
  [new RegExp(`([?&](?:${SENSITIVE_QUERY_PARAMS})=)[^&#\\s"']*`, 'gi'), `$1${REDACTED}`],
  [/(CloudFront-(?:Policy|Signature|Key-Pair-Id)=)[^;,\s"']+/gi, `$1${REDACTED}`],
  [/[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi, '[email]']
]

export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  return SENSITIVE_KEYS.has(normalized) || SENSITIVE_KEY_PARTS.some(part => normalized.includes(part))
}

export function scrubString(value: string): string {
  let out = value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value
  for (const [pattern, replacement] of STRING_RULES) out = out.replace(pattern, replacement)
  return out
}

function scrubValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return scrubString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function' || typeof value === 'symbol') return undefined
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) return scrubValue({ name: value.name, message: value.message }, depth, seen)
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return `[binary ${value.byteLength} bytes]`
  if (typeof value !== 'object') return undefined
  if (seen.has(value)) return '[circular]'
  if (depth >= MAX_DEPTH) return '[depth limit]'
  seen.add(value)

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map(item => scrubValue(item, depth + 1, seen))
  }
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      out[key] = REDACTED
      continue
    }
    const scrubbed = scrubValue(item, depth + 1, seen)
    if (scrubbed !== undefined) out[key] = scrubbed
  }
  return out
}

/** Deep-copies `props` with secrets redacted and `undefined` values dropped. */
export function scrubProps(props: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!props) return {}
  return scrubValue(props, 0, new WeakSet()) as Record<string, unknown>
}

/**
 * Returns an Error safe to hand to an exception tracker: same name and
 * stack frames, with the message (and the message echoed in the stack)
 * scrubbed. Non-Error values become an Error describing them.
 */
export function scrubError(error: unknown): Error {
  if (error instanceof Error) {
    const safe = new Error(scrubString(error.message))
    safe.name = error.name
    if (error.stack) safe.stack = scrubString(error.stack)
    return safe
  }
  if (typeof error === 'string') return new Error(scrubString(error))
  try {
    return new Error(scrubString(JSON.stringify(scrubValue(error, 0, new WeakSet()))))
  } catch {
    return new Error('Unknown error')
  }
}
