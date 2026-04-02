import { describe, it, expect } from 'vitest'
import {
  validateApsId,
  validateUrn,
  validateDerivativeUrn,
  validateRegion,
  sanitizeHeaderFilename
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

describe('sanitizeHeaderFilename', () => {
  it('passes through safe filenames', () => {
    expect(sanitizeHeaderFilename('floor-plan.pdf')).toBe('floor-plan.pdf')
    expect(sanitizeHeaderFilename('Sheet A101.pdf')).toBe('Sheet A101.pdf')
  })

  it('strips double quotes to prevent header breakout', () => {
    expect(sanitizeHeaderFilename('file"name.pdf')).toBe('filename.pdf')
  })

  it('strips newlines to prevent header injection', () => {
    expect(sanitizeHeaderFilename('file\r\nX-Injected: evil')).toBe('fileX-Injected: evil')
  })

  it('strips backslashes', () => {
    expect(sanitizeHeaderFilename('path\\file.pdf')).toBe('pathfile.pdf')
  })

  it('returns "download" for empty or whitespace-only input', () => {
    expect(sanitizeHeaderFilename('')).toBe('download')
    expect(sanitizeHeaderFilename('   ')).toBe('download')
  })
})
