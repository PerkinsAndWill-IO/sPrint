import { describe, it, expect } from 'vitest'
import { normalizeItemUrn } from '../../utils/aps-item'
import { decodeUrn } from '../../utils/urn'

describe('normalizeItemUrn', () => {
  it('encodes URN as base64url and roundtrips correctly', () => {
    const result = normalizeItemUrn({
      id: 'urn:adsk.wipprod:fs.file:vf.abc123?version=3',
      attributes: { displayName: 'TestModel.rvt', name: 'TestModel.rvt', versionNumber: 3 }
    })

    expect(result.versionUrn).toBe('urn:adsk.wipprod:fs.file:vf.abc123?version=3')
    expect(result.name).toBe('TestModel.rvt')
    expect(decodeUrn(result.urn)).toBe(result.versionUrn)
  })

  it('name fallback: displayName → name → "Unknown"', () => {
    const base = { id: 'urn:test', attributes: {} as Record<string, unknown> }
    expect(normalizeItemUrn({ ...base, attributes: { displayName: 'A' } }).name).toBe('A')
    expect(normalizeItemUrn({ ...base, attributes: { name: 'B' } }).name).toBe('B')
    expect(normalizeItemUrn({ ...base, attributes: {} }).name).toBe('Unknown')
  })
})
