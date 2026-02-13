export interface RevitFile {
  id: string
  name: string
  path: string
}

export interface SearchResult {
  files: RevitFile[]
  foldersSearched: number
}

interface SearchVersionItem {
  type: string
  id: string
  attributes: {
    displayName?: string
    name?: string
    fileType?: string
  }
  relationships?: {
    item?: {
      data?: { type: string; id: string }
    }
  }
}

interface SearchIncludedItem {
  type: string
  id: string
  attributes: {
    displayName?: string
    name?: string
  }
  relationships?: {
    parent?: {
      data?: { type: string; id: string }
    }
  }
}

interface SearchResponse {
  data: SearchVersionItem[]
  included?: SearchIncludedItem[]
  links?: { next?: { href: string } }
}

/**
 * Search for .rvt files using the APS Data Management search endpoint.
 * Uses GET /data/v1/projects/{projectId}/folders/{folderId}/search?filter[fileType]=rvt
 * which recursively searches all subfolders server-side.
 */
export async function searchRevitFiles(
  fetchFn: (url: string) => Promise<SearchResponse>,
  projectId: string,
  topFolders: Array<{ id: string; path: string }>,
  onProgress?: (folder: string, searched: number) => void,
  onFile?: (file: RevitFile) => void
): Promise<SearchResult> {
  const files: RevitFile[] = []
  let foldersSearched = 0

  for (const folder of topFolders) {
    foldersSearched++
    onProgress?.(folder.path, foldersSearched)

    let nextUrl: string | null = `/data/v1/projects/${projectId}/folders/${folder.id}/search?filter[fileType]=rvt`

    while (nextUrl) {
      const response = await fetchFn(nextUrl)

      // Build a map of item lineage ID -> parent folder name from `included`
      const itemParentMap = new Map<string, string>()
      if (response.included) {
        for (const inc of response.included) {
          if (inc.type === 'items') {
            itemParentMap.set(inc.id, inc.attributes.displayName || inc.attributes.name || '')
          }
        }
      }

      for (const version of response.data) {
        const name = version.attributes.displayName || version.attributes.name || 'Unnamed'
        // The search response returns versions; get the item lineage ID
        const itemId = version.relationships?.item?.data?.id || version.id
        const file: RevitFile = { id: itemId, name, path: folder.path }
        files.push(file)
        onFile?.(file)
      }

      nextUrl = response.links?.next?.href || null
    }
  }

  return { files, foldersSearched }
}
