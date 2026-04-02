import { describe, it, expect } from 'vitest'
import { buildApsUrl } from '../../utils/aps'

describe('buildApsUrl', () => {
  it('prepends APS base URL to relative paths', () => {
    expect(buildApsUrl('/project/v1/hubs')).toBe('https://developer.api.autodesk.com/project/v1/hubs')
  })

  it('allows full URLs under the APS domain', () => {
    const url = 'https://developer.api.autodesk.com/data/v1/projects/123/folders/456/contents'
    expect(buildApsUrl(url)).toBe(url)
  })

  it('rejects arbitrary URLs that are not under the APS domain', () => {
    expect(() => buildApsUrl('https://evil.com/steal-token')).toThrow()
    expect(() => buildApsUrl('http://169.254.169.254/latest/meta-data')).toThrow()
  })

  it('rejects URLs that try to impersonate the APS domain', () => {
    expect(() => buildApsUrl('https://developer.api.autodesk.com.evil.com/path')).toThrow()
    expect(() => buildApsUrl('https://evil-developer.api.autodesk.com/path')).toThrow()
  })
})
