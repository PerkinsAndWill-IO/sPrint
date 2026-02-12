import { describe, it, expect } from 'vitest'
import { parseExportBody, sanitizeFolderName } from '../../utils/aps-download'

describe('export-derivatives endpoint', () => {
  describe('legacy single-file request validation', () => {
    it('requires urn', () => {
      const result = parseExportBody({ derivatives: ['a'] })
      expect('error' in result && result.error).toBe('urn is required')
    })

    it('requires non-empty derivatives array', () => {
      const result = parseExportBody({ urn: 'test', derivatives: [] })
      expect('error' in result && result.error).toBe('derivatives must be a non-empty array')
    })

    it('requires derivatives to be an array', () => {
      const result = parseExportBody({ urn: 'test' })
      expect('error' in result && result.error).toBe('derivatives must be a non-empty array')
    })

    it('passes valid request and returns fileGroups', () => {
      const result = parseExportBody({ urn: 'test', derivatives: ['a'] })
      expect('fileGroups' in result).toBe(true)
      if ('fileGroups' in result) {
        expect(result.fileGroups).toEqual([{ urn: 'test', derivatives: ['a'] }])
      }
    })
  })

  describe('multi-file request validation', () => {
    it('accepts valid multi-file request', () => {
      const result = parseExportBody({
        files: [
          { urn: 'urn1', derivatives: ['d1'] },
          { urn: 'urn2', derivatives: ['d2', 'd3'] }
        ]
      })
      expect('fileGroups' in result).toBe(true)
      if ('fileGroups' in result) {
        expect(result.fileGroups).toHaveLength(2)
      }
    })

    it('rejects empty files array', () => {
      const result = parseExportBody({ files: [] })
      expect('error' in result && result.error).toBe('files must be a non-empty array')
    })

    it('rejects file group without urn', () => {
      const result = parseExportBody({
        files: [{ urn: '', derivatives: ['d1'] }]
      })
      expect('error' in result && result.error).toBe('Each file must have a urn')
    })

    it('rejects file group with empty derivatives', () => {
      const result = parseExportBody({
        files: [{ urn: 'urn1', derivatives: [] }]
      })
      expect('error' in result && result.error).toBe('Each file must have a non-empty derivatives array')
    })

    it('rejects file group without derivatives', () => {
      const result = parseExportBody({
        files: [{ urn: 'urn1' } as { urn: string; derivatives: string[] }]
      })
      expect('error' in result && result.error).toBe('Each file must have a non-empty derivatives array')
    })

    it('accepts single file in multi-file format', () => {
      const result = parseExportBody({
        files: [{ urn: 'urn1', derivatives: ['d1'], name: 'Model-A' }]
      })
      expect('fileGroups' in result).toBe(true)
    })
  })

  describe('export options parsing', () => {
    it('defaults to mergePdfs false and zipOutput true when options missing', () => {
      const result = parseExportBody({ urn: 'test', derivatives: ['a'] })
      expect('options' in result).toBe(true)
      if ('options' in result) {
        expect(result.options).toEqual({ mergePdfs: false, zipOutput: true })
      }
    })

    it('passes through options when provided', () => {
      const result = parseExportBody({
        urn: 'test',
        derivatives: ['a'],
        options: { mergePdfs: true, zipOutput: false }
      })
      expect('options' in result).toBe(true)
      if ('options' in result) {
        expect(result.options).toEqual({ mergePdfs: true, zipOutput: false })
      }
    })

    it('handles partial options with only mergePdfs', () => {
      const result = parseExportBody({
        urn: 'test',
        derivatives: ['a'],
        options: { mergePdfs: true }
      })
      if ('options' in result) {
        expect(result.options).toEqual({ mergePdfs: true, zipOutput: true })
      }
    })

    it('handles partial options with only zipOutput', () => {
      const result = parseExportBody({
        urn: 'test',
        derivatives: ['a'],
        options: { zipOutput: false }
      })
      if ('options' in result) {
        expect(result.options).toEqual({ mergePdfs: false, zipOutput: false })
      }
    })

    it('includes options in multi-file format', () => {
      const result = parseExportBody({
        files: [{ urn: 'urn1', derivatives: ['d1'] }],
        options: { mergePdfs: true, zipOutput: false }
      })
      expect('options' in result).toBe(true)
      if ('options' in result) {
        expect(result.options).toEqual({ mergePdfs: true, zipOutput: false })
      }
    })
  })

  describe('sanitizeFolderName', () => {
    it('replaces special characters with underscores', () => {
      expect(sanitizeFolderName('file<>:"/\\|?*name')).toBe('file_________name')
    })

    it('returns "unknown" for empty string', () => {
      expect(sanitizeFolderName('')).toBe('unknown')
    })

    it('trims whitespace', () => {
      expect(sanitizeFolderName('  hello  ')).toBe('hello')
    })

    it('returns "unknown" for whitespace-only string', () => {
      expect(sanitizeFolderName('   ')).toBe('unknown')
    })

    it('leaves clean names untouched', () => {
      expect(sanitizeFolderName('Model-A_v2')).toBe('Model-A_v2')
    })
  })
})
