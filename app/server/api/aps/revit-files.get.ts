import { searchRevitFiles } from '../../utils/aps-traversal'
import { validateApsId } from '../../utils/validation'

export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.projectId) {
    throw createError({ statusCode: 400, statusMessage: 'projectId is required' })
  }

  if (!query.hubId && !query.folderId) {
    throw createError({ statusCode: 400, statusMessage: 'hubId or folderId is required' })
  }

  const projectId = validateApsId(query.projectId as string)
  const hubId = query.hubId ? validateApsId(query.hubId as string) : undefined
  const folderId = query.folderId ? validateApsId(query.folderId as string) : undefined

  const token = await getApsAccessToken(event)

  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const send = (data: Record<string, unknown>) => {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    let topFolders: Array<{ id: string, path: string }>

    if (folderId) {
      // External project: search the provided folder directly
      // The search endpoint recursively searches all subfolders server-side,
      // so we don't need to list subfolders and search each one individually
      topFolders = [{ id: folderId!, path: 'Project Files' }]
    } else {
      // Normal hub project: fetch top folders via hubs API
      const topFoldersResponse = await apsFetch<{ data: Array<{ id: string, type: string, attributes: { displayName?: string, name?: string } }> }>(
        token,
        `/project/v1/hubs/${hubId}/projects/${projectId}/topFolders`
      )
      topFolders = topFoldersResponse.data
        .filter(item => item.type === 'folders')
        .map(item => ({
          id: item.id,
          path: item.attributes.displayName || item.attributes.name || 'Unnamed'
        }))
    }

    let totalFiles = 0

    const fetchFn = async (url: string) => {
      const fullUrl = url.startsWith('http') ? url : `https://developer.api.autodesk.com${url}`
      const response = await apsFetch<{
        data: Array<{ type: string, id: string, attributes: { displayName?: string, name?: string, fileType?: string }, relationships?: { item?: { data?: { type: string, id: string } } } }>
        included?: Array<{ type: string, id: string, attributes: { displayName?: string, name?: string }, relationships?: { parent?: { data?: { type: string, id: string } } } }>
        links?: { next?: { href: string } }
      }>(token, fullUrl)

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 50))

      return response
    }

    await searchRevitFiles(
      fetchFn,
      projectId,
      topFolders,
      (folder, searched) => {
        send({ type: 'progress', folder, scanned: searched })
      },
      (file) => {
        totalFiles++
        send({ type: 'file', name: file.name, id: file.id, path: file.path })
      }
    )

    send({ type: 'done', total: totalFiles })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    send({ type: 'error', message })
  }

  event.node.res.end()
})
