export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Parse an Autodesk BIM 360 or ACC URL into a projectId and folderId.
 *
 * Supported formats:
 *  - docs.b360.autodesk.com/projects/{id}/folders/{urn}/detail  (BIM 360)
 *  - acc.autodesk.com/docs/files/projects/{id}?folderUrn={urn}  (ACC US)
 *  - acc.can.autodesk.com/docs/files/projects/{id}?folderUrn={urn} (ACC Canada)
 */
export function parseAccUrl(url: string): { projectId: string; folderId: string } | null {
  try {
    const parsed = new URL(url)

    // BIM 360 pathname format: /projects/{id}/folders/{urn}
    const pathMatch = parsed.pathname.match(/\/projects\/([^/]+)\/folders\/([^/]+)/)
    if (pathMatch) {
      const projectId = pathMatch[1]!
      const folderId = decodeURIComponent(pathMatch[2]!)
      return {
        projectId: projectId.startsWith('b.') ? projectId : `b.${projectId}`,
        folderId,
      }
    }

    // ACC format: /projects/{id}?folderUrn={urn}
    const accPathMatch = parsed.pathname.match(/\/projects\/([^/?]+)/)
    const folderUrn = parsed.searchParams.get('folderUrn')
    if (accPathMatch && folderUrn) {
      const projectId = accPathMatch[1]!
      return {
        projectId: projectId.startsWith('b.') ? projectId : `b.${projectId}`,
        folderId: folderUrn,
      }
    }

    return null
  } catch {
    return null
  }
}

const ACC_BASE_URLS: Record<string, string> = {
  US: 'https://acc.autodesk.com',
  EMEA: 'https://acc.autodesk.eu',
  AU: 'https://acc.autodesk.com.au',
  CA: 'https://acc.can.autodesk.com',
}

export function buildAccProjectUrl(projectId: string, region?: string, itemUrn?: string): string {
  const base = ACC_BASE_URLS[region || 'US'] || ACC_BASE_URLS.US
  const id = projectId.replace(/^b\./, '')
  const url = `${base}/docs/files/projects/${id}`
  if (itemUrn) return `${url}?entityId=${encodeURIComponent(itemUrn)}`
  return url
}

export function randomFrom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!
}
