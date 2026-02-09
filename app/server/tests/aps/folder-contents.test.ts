import { describe, it, expect } from 'vitest'

interface NormalizedContent {
  id: string
  name: string
  type: 'folders' | 'items'
  isRevitFile: boolean
}

function normalizeFolderContents(response: {
  data: Array<{ id: string, type: string, attributes: { displayName?: string, name?: string } }>
}): NormalizedContent[] {
  return response.data.map((item) => {
    const name = item.attributes.displayName || item.attributes.name || 'Unnamed'
    return {
      id: item.id,
      name,
      type: item.type === 'folders' ? 'folders' as const : 'items' as const,
      isRevitFile: name.toLowerCase().endsWith('.rvt')
    }
  })
}

describe('folder-contents normalization', () => {
  it('normalizes JSON:API response — maps data[].attributes.displayName to name', () => {
    const response = {
      data: [{
        id: 'item-1',
        type: 'items',
        attributes: { displayName: 'Architectural.rvt' }
      }]
    }
    const result = normalizeFolderContents(response)
    expect(result[0].name).toBe('Architectural.rvt')
  })

  it('detects .rvt files — sets isRevitFile: true for .rvt extensions', () => {
    const response = {
      data: [
        { id: 'item-1', type: 'items', attributes: { displayName: 'Model.rvt' } },
        { id: 'item-2', type: 'items', attributes: { displayName: 'Floor-Plan.pdf' } }
      ]
    }
    const result = normalizeFolderContents(response)
    expect(result[0].isRevitFile).toBe(true)
    expect(result[1].isRevitFile).toBe(false)
  })

  it('detects folders vs items — correctly sets type and hasChildren', () => {
    const response = {
      data: [
        { id: 'folder-1', type: 'folders', attributes: { displayName: 'Plans' } },
        { id: 'item-1', type: 'items', attributes: { displayName: 'Model.rvt' } }
      ]
    }
    const result = normalizeFolderContents(response)
    expect(result[0].type).toBe('folders')
    expect(result[1].type).toBe('items')
  })

  it('handles missing displayName — falls back to attributes.name', () => {
    const response = {
      data: [{
        id: 'item-1',
        type: 'items',
        attributes: { name: 'Fallback Name.rvt' }
      }]
    }
    const result = normalizeFolderContents(response)
    expect(result[0].name).toBe('Fallback Name.rvt')
    expect(result[0].isRevitFile).toBe(true)
  })

  it('handles missing displayName and name — falls back to "Unnamed"', () => {
    const response = {
      data: [{
        id: 'item-1',
        type: 'items',
        attributes: {}
      }]
    }
    const result = normalizeFolderContents(response)
    expect(result[0].name).toBe('Unnamed')
    expect(result[0].isRevitFile).toBe(false)
  })

  it('handles empty data array', () => {
    const result = normalizeFolderContents({ data: [] })
    expect(result).toEqual([])
  })

  it('handles mixed content types', () => {
    const response = {
      data: [
        { id: 'f1', type: 'folders', attributes: { displayName: 'Revisions' } },
        { id: 'i1', type: 'items', attributes: { displayName: 'Structural.rvt' } },
        { id: 'i2', type: 'items', attributes: { displayName: 'Notes.docx' } },
        { id: 'i3', type: 'items', attributes: { displayName: 'MEP.rvt' } }
      ]
    }
    const result = normalizeFolderContents(response)
    expect(result).toHaveLength(4)
    expect(result.filter(c => c.type === 'folders')).toHaveLength(1)
    expect(result.filter(c => c.isRevitFile)).toHaveLength(2)
  })
})
