import { describe, it, expect } from 'vitest'
import { normalizeFolderContents } from '../../utils/aps-normalize'

describe('normalizeFolderContents', () => {
  it('name fallback: displayName → name → "Unnamed"', () => {
    const result = normalizeFolderContents([
      { id: '1', type: 'items', attributes: { displayName: 'Display.rvt', name: 'Ignored' } },
      { id: '2', type: 'items', attributes: { name: 'Fallback.rvt' } },
      { id: '3', type: 'items', attributes: {} }
    ])
    expect(result.map(r => r.name)).toEqual(['Display.rvt', 'Fallback.rvt', 'Unnamed'])
  })

  it('classifies types and detects .rvt case-insensitively', () => {
    const result = normalizeFolderContents([
      { id: 'f1', type: 'folders', attributes: { displayName: 'Plans' } },
      { id: 'i1', type: 'items', attributes: { displayName: 'Model.RVT' } },
      { id: 'i2', type: 'items', attributes: { displayName: 'Notes.pdf' } }
    ])
    expect(result[0].type).toBe('folders')
    expect(result[1].type).toBe('items')
    expect(result[1].isRevitFile).toBe(true)
    expect(result[2].isRevitFile).toBe(false)
  })
})
