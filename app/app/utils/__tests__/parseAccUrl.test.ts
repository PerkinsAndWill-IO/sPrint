import { describe, it, expect } from 'vitest'
import { parseAccUrl } from '../index'

describe('parseAccUrl', () => {
  describe('BIM 360 pathname format', () => {
    it('parses a standard BIM 360 URL with folder in pathname', () => {
      const url =
        'https://docs.b360.autodesk.com/projects/abc123/folders/urn%3Aadsk.wipsprod%3Afs.folder%3Aco.xyz/detail'
      const result = parseAccUrl(url)
      expect(result).toEqual({
        projectId: 'b.abc123',
        folderId: 'urn:adsk.wipsprod:fs.folder:co.xyz',
      })
    })

    it('does not double-add the b. prefix when already present', () => {
      const url =
        'https://docs.b360.autodesk.com/projects/b.abc123/folders/urn%3Afolder%3Aid/detail'
      const result = parseAccUrl(url)
      expect(result?.projectId).toBe('b.abc123')
    })
  })

  describe('ACC US format (folderUrn query param)', () => {
    it('parses a standard ACC US URL', () => {
      const url =
        'https://acc.autodesk.com/docs/files/projects/abc123?folderUrn=urn%3Aadsk.wipsprod%3Afs.folder%3Aco.xyz'
      const result = parseAccUrl(url)
      expect(result).toEqual({
        projectId: 'b.abc123',
        folderId: 'urn:adsk.wipsprod:fs.folder:co.xyz',
      })
    })
  })

  describe('ACC Canada format (acc.can.autodesk.com)', () => {
    it('parses the Canadian ACC URL from folderUrn query param', () => {
      const url =
        'https://acc.can.autodesk.com/docs/files/projects/ba22eefc-a47b-4960-979a-e97b06bcebdc?folderUrn=urn%3Aadsk.wips7bwc%3Afs.folder%3Aco.qDsq1BhNRyWTjFqU9mre9w&viewModel=detail&moduleId=folders'
      const result = parseAccUrl(url)
      expect(result).toEqual({
        projectId: 'b.ba22eefc-a47b-4960-979a-e97b06bcebdc',
        folderId: 'urn:adsk.wips7bwc:fs.folder:co.qDsq1BhNRyWTjFqU9mre9w',
      })
    })

    it('does not double-add the b. prefix for Canadian URLs', () => {
      const url =
        'https://acc.can.autodesk.com/docs/files/projects/b.some-id?folderUrn=urn%3Afolder'
      const result = parseAccUrl(url)
      expect(result?.projectId).toBe('b.some-id')
    })
  })

  describe('invalid inputs', () => {
    it('returns null for a URL with no recognisable project/folder pattern', () => {
      expect(parseAccUrl('https://acc.autodesk.com/dashboard')).toBeNull()
    })

    it('returns null for an ACC URL missing folderUrn', () => {
      expect(
        parseAccUrl('https://acc.autodesk.com/docs/files/projects/abc123')
      ).toBeNull()
    })

    it('returns null for a completely invalid string', () => {
      expect(parseAccUrl('not-a-url')).toBeNull()
    })
  })
})
