import { describe, it, expect } from 'vitest'
import { parseSignedCookies, buildCloudFrontUrl, deriveFileName } from '../../utils/aps-download'

describe('aps-download utilities', () => {
  describe('parseSignedCookies', () => {
    it('extracts CloudFront cookie values from set-cookie header', () => {
      const header = 'CloudFront-Policy=eyJhbGciOiJIUzI1NiJ9;Path=/;Secure;HttpOnly, CloudFront-Key-Pair-Id=APKAEXAMPLE;Path=/;Secure;HttpOnly, CloudFront-Signature=abc123def456;Path=/;Secure;HttpOnly'
      const result = parseSignedCookies(header)

      expect(result.policy).toBe('eyJhbGciOiJIUzI1NiJ9')
      expect(result.keyPairId).toBe('APKAEXAMPLE')
      expect(result.signature).toBe('abc123def456')
    })

    it('returns empty strings for missing cookies', () => {
      const result = parseSignedCookies('')

      expect(result.policy).toBe('')
      expect(result.keyPairId).toBe('')
      expect(result.signature).toBe('')
    })

    it('handles cookies with extra whitespace', () => {
      const header = ' CloudFront-Policy=policyValue;Path=/, CloudFront-Key-Pair-Id=keyId;Path=/, CloudFront-Signature=sigValue;Path=/'
      const result = parseSignedCookies(header)

      expect(result.policy).toBe('policyValue')
      expect(result.keyPairId).toBe('keyId')
      expect(result.signature).toBe('sigValue')
    })
  })

  describe('buildCloudFrontUrl', () => {
    it('constructs download URL with query parameters', () => {
      const result = buildCloudFrontUrl(
        'https://cdn.example.com/output/file.pdf',
        'policyValue',
        'APKAEXAMPLE',
        'signatureValue'
      )

      expect(result).toBe('https://cdn.example.com/output/file.pdf?Policy=policyValue&Key-Pair-Id=APKAEXAMPLE&Signature=signatureValue')
    })

    it('works with URL that already has a path', () => {
      const result = buildCloudFrontUrl(
        'https://cdn.example.com/deep/path/to/file.pdf',
        'p',
        'k',
        's'
      )

      expect(result).toBe('https://cdn.example.com/deep/path/to/file.pdf?Policy=p&Key-Pair-Id=k&Signature=s')
    })
  })

  describe('deriveFileName', () => {
    it('extracts filename from derivative URN', () => {
      expect(deriveFileName('urn:adsk.viewing:fs.file:output/pdf/A001.pdf')).toBe('A001.pdf')
    })

    it('handles URN with nested path', () => {
      expect(deriveFileName('urn:adsk.viewing:fs.file:output/pdf/subfolder/Sheet.pdf')).toBe('Sheet.pdf')
    })

    it('handles URN with single segment', () => {
      expect(deriveFileName('file.pdf')).toBe('file.pdf')
    })

    it('returns fallback for empty URN', () => {
      expect(deriveFileName('')).toBe('unknown.pdf')
    })
  })
})
