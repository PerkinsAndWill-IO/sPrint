export function encodeUrn(urn: string): string {
  if (!urn) return ''
  return Buffer.from(urn)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function decodeUrn(encoded: string): string {
  if (!encoded) return ''
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf-8')
}
