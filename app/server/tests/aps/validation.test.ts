import { describe, it, expect } from 'vitest'
import {
  validateApsId,
  validateUrn,
  validateDerivativeUrn,
  validateRegion,
  contentDisposition
} from '../../utils/validation'

describe('validateApsId', () => {
  it('accepts valid APS IDs (alphanumeric, dots, dashes, underscores, colons)', () => {
    expect(validateApsId('b.1234-abcd')).toBe('b.1234-abcd')
    expect(validateApsId('urn:adsk.wipprod:fs.folder:co.abc123')).toBe('urn:adsk.wipprod:fs.folder:co.abc123')
    expect(validateApsId('a.hub_123')).toBe('a.hub_123')
  })

  it('rejects IDs with path traversal', () => {
    expect(() => validateApsId('../etc/passwd')).toThrow()
    expect(() => validateApsId('valid/../../bad')).toThrow()
  })

  it('rejects IDs with newlines or control characters', () => {
    expect(() => validateApsId('id\ninjection')).toThrow()
    expect(() => validateApsId('id\r\nheader: value')).toThrow()
  })

  it('rejects empty strings', () => {
    expect(() => validateApsId('')).toThrow()
  })

  it('rejects IDs that are too long', () => {
    expect(() => validateApsId('a'.repeat(1001))).toThrow()
  })
})

describe('validateUrn', () => {
  it('accepts valid base64-encoded URNs', () => {
    const urn = 'dXJuOmFkc2sud2lwcHJvZDpkbS5saW5lYWdlOmFiYzEyMw'
    expect(validateUrn(urn)).toBe(urn)
  })

  it('accepts URNs with base64url characters (-, _, =)', () => {
    const urn = 'dXJuOmFkc2sud2lwcHJvZDpk-bS5saW5lYWdl_abc=='
    expect(validateUrn(urn)).toBe(urn)
  })

  it('rejects URNs with path traversal', () => {
    expect(() => validateUrn('../../../etc/passwd')).toThrow()
  })

  it('rejects URNs with newlines', () => {
    expect(() => validateUrn('valid\ninjection')).toThrow()
  })

  it('rejects empty URNs', () => {
    expect(() => validateUrn('')).toThrow()
  })
})

describe('validateDerivativeUrn', () => {
  it('accepts valid derivative URNs with slashes', () => {
    const urn = 'urn:adsk.viewing:fs.file:abc123/output/Resource/sheet/1234-abcd/A101 - Floor Plan.pdf'
    expect(validateDerivativeUrn(urn)).toBe(urn)
  })

  it('accepts derivative URNs with spaces and dots', () => {
    const urn = 'output/some file.pdf'
    expect(validateDerivativeUrn(urn)).toBe(urn)
  })

  it('rejects derivative URNs with newlines', () => {
    expect(() => validateDerivativeUrn('file\r\nX-Injected: evil')).toThrow()
  })

  it('rejects empty string', () => {
    expect(() => validateDerivativeUrn('')).toThrow()
  })
})

describe('validateRegion', () => {
  it('accepts valid region values', () => {
    expect(validateRegion('US')).toBe('US')
    expect(validateRegion('EMEA')).toBe('EMEA')
    expect(validateRegion(undefined)).toBeUndefined()
  })

  it('rejects invalid region values', () => {
    expect(() => validateRegion('EVIL')).toThrow()
    expect(() => validateRegion('../etc')).toThrow()
  })
})

describe('contentDisposition', () => {
  // Node throws ERR_INVALID_CHAR for header values with chars above 0xFF —
  // every produced value must be Latin-1-safe (we keep it ASCII-only)
  function expectHeaderSafe(value: string) {
    expect(value).toMatch(/^[\x20-\x7E]*$/)
  }

  it('passes through safe ASCII filenames', () => {
    const v = contentDisposition('floor-plan.pdf')
    expect(v).toContain('attachment; filename="floor-plan.pdf"')
    expect(v).toContain('filename*=UTF-8\'\'floor-plan.pdf')
    expectHeaderSafe(v)
  })

  it('replaces non-ASCII with underscores in the fallback and encodes filename*', () => {
    const v = contentDisposition('東京タワー.zip')
    expect(v).toContain('filename="_____.zip"')
    expect(v).toContain('filename*=UTF-8\'\'%E6%9D%B1%E4%BA%AC%E3%82%BF%E3%83%AF%E3%83%BC.zip')
    expectHeaderSafe(v)
  })

  it('handles em-dashes and smart quotes without throwing header-invalid chars', () => {
    const v = contentDisposition('Plan — “Rev A”.pdf')
    expectHeaderSafe(v)
    expect(v).toContain('filename="Plan _ _Rev A_.pdf"')
  })

  it('strips quotes and backslashes from the fallback to prevent header breakout', () => {
    const v = contentDisposition('file"name\\evil.pdf')
    expect(v).toContain('filename="filenameevil.pdf"')
    expectHeaderSafe(v)
  })

  it('newlines cannot reach the header value', () => {
    const v = contentDisposition('file\r\nX-Injected: evil')
    expectHeaderSafe(v)
    expect(v).not.toContain('\r')
    expect(v).not.toContain('\n')
  })

  it('percent-encodes RFC 5987 attr-char exceptions in filename*', () => {
    const v = contentDisposition(`a'b(c)d*e.pdf`)
    expect(v).toContain('filename*=UTF-8\'\'a%27b%28c%29d%2Ae.pdf')
  })

  it('falls back to "download" for empty names', () => {
    expect(contentDisposition('')).toContain('filename="download"')
  })

  it('supports inline disposition', () => {
    expect(contentDisposition('img.png', 'inline')).toMatch(/^inline; /)
  })
})
