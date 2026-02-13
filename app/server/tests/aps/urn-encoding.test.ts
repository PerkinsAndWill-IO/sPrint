import { describe, it, expect } from 'vitest'
import { encodeUrn, decodeUrn } from '../../utils/urn'

describe('URN encoding', () => {
  const sampleUrn = 'urn:adsk.wipprod:fs.file:vf.abc123?version=1'

  it('encodes a version URN to base64url without padding', () => {
    const encoded = encodeUrn(sampleUrn)

    // Should not contain standard base64 padding
    expect(encoded).not.toContain('=')
    // Should not contain standard base64 chars that differ in base64url
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
  })

  it('roundtrips: decode(encode(urn)) === urn', () => {
    const encoded = encodeUrn(sampleUrn)
    const decoded = decodeUrn(encoded)
    expect(decoded).toBe(sampleUrn)
  })

  it('handles URNs with colons, dots, and question marks', () => {
    const urn = 'urn:adsk.wipprod:dm.lineage:abc.123?version=5'
    const encoded = encodeUrn(urn)
    expect(decodeUrn(encoded)).toBe(urn)
  })

  it('returns empty string for empty input', () => {
    expect(encodeUrn('')).toBe('')
    expect(decodeUrn('')).toBe('')
  })

  it('produces valid base64url characters only', () => {
    const encoded = encodeUrn(sampleUrn)
    // base64url alphabet: A-Z, a-z, 0-9, -, _
    expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/)
  })
})
