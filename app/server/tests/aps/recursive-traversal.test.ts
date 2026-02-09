import { describe, it, expect } from 'vitest'

// Types matching APS JSON:API responses
interface ApsItem {
  id: string
  type: string
  attributes: { displayName?: string, name?: string }
}

interface ApsResponse {
  data: ApsItem[]
  links?: { next?: { href: string } }
}

interface RevitFile {
  id: string
  name: string
  path: string
}

// Extracted recursive traversal logic (mirrors server/api/aps/revit-files.get.ts)
async function findRevitFiles(
  fetchFn: (path: string) => Promise<ApsResponse>,
  topFolders: Array<{ id: string, path: string }>
): Promise<{ files: RevitFile[], foldersScanned: number }> {
  const queue = [...topFolders]
  const files: RevitFile[] = []
  let foldersScanned = 0

  while (queue.length > 0) {
    const folder = queue.shift()!
    foldersScanned++

    let nextUrl: string | null = `/data/v1/projects/proj-1/folders/${folder.id}/contents`

    while (nextUrl) {
      const response = await fetchFn(nextUrl)

      for (const item of response.data) {
        const name = item.attributes.displayName || item.attributes.name || 'Unnamed'

        if (item.type === 'folders') {
          queue.push({ id: item.id, path: `${folder.path}/${name}` })
        } else if (name.toLowerCase().endsWith('.rvt')) {
          files.push({ id: item.id, name, path: folder.path })
        }
      }

      nextUrl = response.links?.next?.href || null
    }
  }

  return { files, foldersScanned }
}

/*
Mock folder structure:
  Plans/
    Architectural.rvt
    Floor-Plan.pdf
    Revisions/
      Arch-v2.RVT
      Notes.docx
  Models/
    Structural.rvt
    MEP.rvt
    Coordination/
      Combined.nwc
  Empty-Folder/
*/

function createMockFetch(): (path: string) => Promise<ApsResponse> {
  const folderContents: Record<string, ApsResponse> = {
    'folder-plans': {
      data: [
        { id: 'item-arch', type: 'items', attributes: { displayName: 'Architectural.rvt' } },
        { id: 'item-pdf', type: 'items', attributes: { displayName: 'Floor-Plan.pdf' } },
        { id: 'folder-revisions', type: 'folders', attributes: { displayName: 'Revisions' } }
      ]
    },
    'folder-revisions': {
      data: [
        { id: 'item-arch-v2', type: 'items', attributes: { displayName: 'Arch-v2.RVT' } },
        { id: 'item-notes', type: 'items', attributes: { displayName: 'Notes.docx' } }
      ]
    },
    'folder-models': {
      data: [
        { id: 'item-struct', type: 'items', attributes: { displayName: 'Structural.rvt' } },
        { id: 'item-mep', type: 'items', attributes: { displayName: 'MEP.rvt' } },
        { id: 'folder-coord', type: 'folders', attributes: { displayName: 'Coordination' } }
      ]
    },
    'folder-coord': {
      data: [
        { id: 'item-nwc', type: 'items', attributes: { displayName: 'Combined.nwc' } }
      ]
    },
    'folder-empty': {
      data: []
    }
  }

  return async (path: string) => {
    // Extract folder ID from path
    const match = path.match(/folders\/([^/]+)\/contents/)
    const folderId = match?.[1] || ''
    return folderContents[folderId] || { data: [] }
  }
}

const topFolders = [
  { id: 'folder-plans', path: 'Plans' },
  { id: 'folder-models', path: 'Models' },
  { id: 'folder-empty', path: 'Empty-Folder' }
]

describe('recursive folder traversal', () => {
  it('finds all .rvt files starting from a single top-level folder (including subfolders)', async () => {
    const mockFetch = createMockFetch()
    const result = await findRevitFiles(mockFetch, [{ id: 'folder-plans', path: 'Plans' }])
    const rvtFiles = result.files.filter(f => f.name.toLowerCase().endsWith('.rvt'))
    // Plans/ has Architectural.rvt, Plans/Revisions/ has Arch-v2.RVT
    expect(rvtFiles).toHaveLength(2)
    expect(rvtFiles.map(f => f.name).sort()).toEqual(['Arch-v2.RVT', 'Architectural.rvt'])
  })

  it('correctly traverses deeply nested folders (3+ levels)', async () => {
    const mockFetch = createMockFetch()
    const result = await findRevitFiles(mockFetch, topFolders)
    // Should find Arch-v2.RVT in Plans/Revisions/
    const archV2 = result.files.find(f => f.name === 'Arch-v2.RVT')
    expect(archV2).toBeDefined()
    expect(archV2!.path).toBe('Plans/Revisions')
  })

  it('only returns .rvt files — ignores .dwg, .pdf, .nwc, .docx', async () => {
    const mockFetch = createMockFetch()
    const result = await findRevitFiles(mockFetch, topFolders)
    for (const file of result.files) {
      expect(file.name.toLowerCase().endsWith('.rvt')).toBe(true)
    }
    // Verify non-rvt files are excluded
    const names = result.files.map(f => f.name)
    expect(names).not.toContain('Floor-Plan.pdf')
    expect(names).not.toContain('Notes.docx')
    expect(names).not.toContain('Combined.nwc')
  })

  it('gracefully handles empty folders', async () => {
    const mockFetch = createMockFetch()
    const result = await findRevitFiles(mockFetch, [{ id: 'folder-empty', path: 'Empty-Folder' }])
    expect(result.files).toHaveLength(0)
    expect(result.foldersScanned).toBe(1)
  })

  it('follows pagination links.next', async () => {
    const page1: ApsResponse = {
      data: [
        { id: 'item-a', type: 'items', attributes: { displayName: 'PageOne.rvt' } }
      ],
      links: { next: { href: '/data/v1/projects/proj-1/folders/folder-paged/contents?page=2' } }
    }
    const page2: ApsResponse = {
      data: [
        { id: 'item-b', type: 'items', attributes: { displayName: 'PageTwo.rvt' } }
      ]
    }

    let callCount = 0
    const pagedFetch = async (path: string): Promise<ApsResponse> => {
      callCount++
      if (path.includes('page=2')) return page2
      return page1
    }

    const result = await findRevitFiles(pagedFetch, [{ id: 'folder-paged', path: 'Paged' }])
    expect(result.files).toHaveLength(2)
    expect(result.files[0].name).toBe('PageOne.rvt')
    expect(result.files[1].name).toBe('PageTwo.rvt')
    expect(callCount).toBe(2)
  })

  it('returns empty array when no .rvt files exist', async () => {
    const noRvtFetch = async (): Promise<ApsResponse> => ({
      data: [
        { id: 'item-1', type: 'items', attributes: { displayName: 'Design.dwg' } },
        { id: 'item-2', type: 'items', attributes: { displayName: 'Report.pdf' } }
      ]
    })
    const result = await findRevitFiles(noRvtFetch, [{ id: 'folder-1', path: 'Root' }])
    expect(result.files).toEqual([])
  })

  it('handles 100+ folders without stack overflow (BFS approach)', async () => {
    // Create a wide folder tree with 150 folders
    const wideFetch = async (path: string): Promise<ApsResponse> => {
      const match = path.match(/folders\/([^/]+)\/contents/)
      const folderId = match?.[1] || ''

      // Only the root folder has sub-folders
      if (folderId === 'root-folder') {
        return {
          data: Array.from({ length: 150 }, (_, i) => ({
            id: `sub-folder-${i}`,
            type: 'folders',
            attributes: { displayName: `Subfolder-${i}` }
          }))
        }
      }

      // Each sub-folder has one .rvt file
      return {
        data: [{
          id: `rvt-${folderId}`,
          type: 'items',
          attributes: { displayName: `Model-${folderId}.rvt` }
        }]
      }
    }

    const result = await findRevitFiles(wideFetch, [{ id: 'root-folder', path: 'Root' }])
    expect(result.files).toHaveLength(150)
    expect(result.foldersScanned).toBe(151) // root + 150 sub-folders
  })

  it('case-insensitive .rvt detection — finds Model.RVT, model.rvt, MODEL.Rvt', async () => {
    const caseFetch = async (): Promise<ApsResponse> => ({
      data: [
        { id: 'i1', type: 'items', attributes: { displayName: 'Model.RVT' } },
        { id: 'i2', type: 'items', attributes: { displayName: 'model.rvt' } },
        { id: 'i3', type: 'items', attributes: { displayName: 'MODEL.Rvt' } },
        { id: 'i4', type: 'items', attributes: { displayName: 'design.RVT' } },
        { id: 'i5', type: 'items', attributes: { displayName: 'notes.txt' } }
      ]
    })

    const result = await findRevitFiles(caseFetch, [{ id: 'folder-case', path: 'Case' }])
    expect(result.files).toHaveLength(4)
  })

  it('finds all expected .rvt files in the full mock tree', async () => {
    const mockFetch = createMockFetch()
    const result = await findRevitFiles(mockFetch, topFolders)

    const fileNames = result.files.map(f => f.name).sort()
    expect(fileNames).toEqual([
      'Arch-v2.RVT',
      'Architectural.rvt',
      'MEP.rvt',
      'Structural.rvt'
    ])
  })

  it('tracks correct folder paths for discovered files', async () => {
    const mockFetch = createMockFetch()
    const result = await findRevitFiles(mockFetch, topFolders)

    const arch = result.files.find(f => f.name === 'Architectural.rvt')
    expect(arch!.path).toBe('Plans')

    const struct = result.files.find(f => f.name === 'Structural.rvt')
    expect(struct!.path).toBe('Models')

    const archV2 = result.files.find(f => f.name === 'Arch-v2.RVT')
    expect(archV2!.path).toBe('Plans/Revisions')
  })

  it('scans the correct number of folders', async () => {
    const mockFetch = createMockFetch()
    const result = await findRevitFiles(mockFetch, topFolders)
    // Plans, Plans/Revisions, Models, Models/Coordination, Empty-Folder = 5
    expect(result.foldersScanned).toBe(5)
  })
})
