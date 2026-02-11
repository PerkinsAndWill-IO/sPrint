import { describe, it, expect } from 'vitest'
import { searchRevitFiles } from '../../utils/aps-traversal'

interface SearchVersion {
  type: string
  id: string
  attributes: { displayName?: string; name?: string; fileType?: string }
  relationships?: { item?: { data?: { type: string; id: string } } }
}

interface SearchIncluded {
  type: string
  id: string
  attributes: { displayName?: string; name?: string }
  relationships?: { parent?: { data?: { type: string; id: string } } }
}

interface SearchResponse {
  data: SearchVersion[]
  included?: SearchIncluded[]
  links?: { next?: { href: string } }
}

const PROJECT_ID = 'b.project-123'

function makeVersion(id: string, name: string, itemLineageId?: string): SearchVersion {
  return {
    type: 'versions',
    id: `urn:adsk.wipprod:fs.file:vf.${id}?version=1`,
    attributes: { displayName: name, fileType: 'rvt' },
    relationships: {
      item: {
        data: { type: 'items', id: itemLineageId || `urn:adsk.wipprod:dm.lineage:${id}` }
      }
    }
  }
}

function makeIncludedItem(lineageId: string, name: string, parentFolderId?: string): SearchIncluded {
  return {
    type: 'items',
    id: lineageId,
    attributes: { displayName: name },
    relationships: parentFolderId
      ? { parent: { data: { type: 'folders', id: parentFolderId } } }
      : undefined
  }
}

/*
  Mock search responses per folder:
  - "Project Files" folder: returns 2 rvt files (Architectural.rvt, Structural.rvt)
  - "Plans" folder: returns 1 rvt file (MEP.rvt)
  - "Empty" folder: returns 0 results
*/

function createMockSearchFetch(): (url: string) => Promise<SearchResponse> {
  const responses: Record<string, SearchResponse> = {
    'folder-project-files': {
      data: [
        makeVersion('arch', 'Architectural.rvt', 'urn:adsk.wipprod:dm.lineage:arch'),
        makeVersion('struct', 'Structural.rvt', 'urn:adsk.wipprod:dm.lineage:struct')
      ],
      included: [
        makeIncludedItem('urn:adsk.wipprod:dm.lineage:arch', 'Architectural.rvt', 'folder-sub-arch'),
        makeIncludedItem('urn:adsk.wipprod:dm.lineage:struct', 'Structural.rvt', 'folder-sub-struct')
      ]
    },
    'folder-plans': {
      data: [
        makeVersion('mep', 'MEP.rvt', 'urn:adsk.wipprod:dm.lineage:mep')
      ],
      included: [
        makeIncludedItem('urn:adsk.wipprod:dm.lineage:mep', 'MEP.rvt', 'folder-plans')
      ]
    },
    'folder-empty': {
      data: []
    }
  }

  return async (url: string) => {
    // Extract folder ID from the search URL pattern:
    // /data/v1/projects/{projectId}/folders/{folderId}/search?filter[fileType]=rvt
    const match = url.match(/folders\/([^/]+)\/search/)
    const folderId = match?.[1] || ''
    return responses[folderId] || { data: [] }
  }
}

const topFolders = [
  { id: 'folder-project-files', path: 'Project Files' },
  { id: 'folder-plans', path: 'Plans' },
  { id: 'folder-empty', path: 'Empty' }
]

describe('APS search-based .rvt file discovery', () => {
  it('finds all .rvt files across multiple top folders', async () => {
    const fetch = createMockSearchFetch()
    const result = await searchRevitFiles(fetch, PROJECT_ID, topFolders)

    expect(result.files).toHaveLength(3)
    const names = result.files.map(f => f.name).sort()
    expect(names).toEqual(['Architectural.rvt', 'MEP.rvt', 'Structural.rvt'])
  })

  it('returns item lineage IDs (not version IDs)', async () => {
    const fetch = createMockSearchFetch()
    const result = await searchRevitFiles(fetch, PROJECT_ID, topFolders)

    const arch = result.files.find(f => f.name === 'Architectural.rvt')
    expect(arch!.id).toBe('urn:adsk.wipprod:dm.lineage:arch')
  })

  it('associates files with their top folder path', async () => {
    const fetch = createMockSearchFetch()
    const result = await searchRevitFiles(fetch, PROJECT_ID, topFolders)

    const arch = result.files.find(f => f.name === 'Architectural.rvt')
    expect(arch!.path).toBe('Project Files')

    const mep = result.files.find(f => f.name === 'MEP.rvt')
    expect(mep!.path).toBe('Plans')
  })

  it('handles empty search results', async () => {
    const fetch = createMockSearchFetch()
    const result = await searchRevitFiles(fetch, PROJECT_ID, [{ id: 'folder-empty', path: 'Empty' }])

    expect(result.files).toHaveLength(0)
    expect(result.foldersSearched).toBe(1)
  })

  it('tracks number of folders searched', async () => {
    const fetch = createMockSearchFetch()
    const result = await searchRevitFiles(fetch, PROJECT_ID, topFolders)

    expect(result.foldersSearched).toBe(3)
  })

  it('calls onProgress for each top folder', async () => {
    const fetch = createMockSearchFetch()
    const progressCalls: Array<{ folder: string; searched: number }> = []

    await searchRevitFiles(
      fetch,
      PROJECT_ID,
      topFolders,
      (folder, searched) => progressCalls.push({ folder, searched })
    )

    expect(progressCalls).toHaveLength(3)
    expect(progressCalls[0]).toEqual({ folder: 'Project Files', searched: 1 })
    expect(progressCalls[1]).toEqual({ folder: 'Plans', searched: 2 })
    expect(progressCalls[2]).toEqual({ folder: 'Empty', searched: 3 })
  })

  it('calls onFile for each discovered file', async () => {
    const fetch = createMockSearchFetch()
    const fileCalls: Array<{ id: string; name: string; path: string }> = []

    await searchRevitFiles(
      fetch,
      PROJECT_ID,
      topFolders,
      undefined,
      (file) => fileCalls.push(file)
    )

    expect(fileCalls).toHaveLength(3)
    expect(fileCalls.map(f => f.name).sort()).toEqual(['Architectural.rvt', 'MEP.rvt', 'Structural.rvt'])
  })

  it('follows pagination links', async () => {
    let callCount = 0
    const pagedFetch = async (url: string): Promise<SearchResponse> => {
      callCount++
      if (url.includes('page')) {
        return {
          data: [makeVersion('page2', 'Page2.rvt', 'urn:lineage:page2')]
        }
      }
      return {
        data: [makeVersion('page1', 'Page1.rvt', 'urn:lineage:page1')],
        links: { next: { href: `https://developer.api.autodesk.com/data/v1/projects/${PROJECT_ID}/folders/f1/search?filter[fileType]=rvt&page[number]=1` } }
      }
    }

    const result = await searchRevitFiles(pagedFetch, PROJECT_ID, [{ id: 'f1', path: 'Root' }])

    expect(result.files).toHaveLength(2)
    expect(result.files[0].name).toBe('Page1.rvt')
    expect(result.files[1].name).toBe('Page2.rvt')
    expect(callCount).toBe(2)
  })

  it('constructs correct search URL with filter', async () => {
    const urls: string[] = []
    const captureFetch = async (url: string): Promise<SearchResponse> => {
      urls.push(url)
      return { data: [] }
    }

    await searchRevitFiles(captureFetch, PROJECT_ID, [{ id: 'folder-abc', path: 'Root' }])

    expect(urls).toHaveLength(1)
    expect(urls[0]).toBe(`/data/v1/projects/${PROJECT_ID}/folders/folder-abc/search?filter[fileType]=rvt`)
  })

  it('falls back to version ID when item relationship is missing', async () => {
    const noRelFetch = async (): Promise<SearchResponse> => ({
      data: [{
        type: 'versions',
        id: 'urn:version:fallback',
        attributes: { displayName: 'Fallback.rvt', fileType: 'rvt' }
        // no relationships
      }]
    })

    const result = await searchRevitFiles(noRelFetch, PROJECT_ID, [{ id: 'f1', path: 'Root' }])

    expect(result.files[0].id).toBe('urn:version:fallback')
    expect(result.files[0].name).toBe('Fallback.rvt')
  })

  it('uses name attribute when displayName is missing', async () => {
    const nameOnlyFetch = async (): Promise<SearchResponse> => ({
      data: [{
        type: 'versions',
        id: 'urn:version:v1',
        attributes: { name: 'NameOnly.rvt', fileType: 'rvt' },
        relationships: { item: { data: { type: 'items', id: 'urn:lineage:v1' } } }
      }]
    })

    const result = await searchRevitFiles(nameOnlyFetch, PROJECT_ID, [{ id: 'f1', path: 'Root' }])
    expect(result.files[0].name).toBe('NameOnly.rvt')
  })

  it('returns empty result when no top folders exist', async () => {
    const fetch = createMockSearchFetch()
    const result = await searchRevitFiles(fetch, PROJECT_ID, [])

    expect(result.files).toHaveLength(0)
    expect(result.foldersSearched).toBe(0)
  })
})
