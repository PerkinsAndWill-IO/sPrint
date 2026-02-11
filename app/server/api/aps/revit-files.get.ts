import { searchRevitFiles } from '../../utils/aps-traversal'

export default eventHandler(async (event) => {
  const { hubId, projectId } = getQuery(event)

  if (!hubId || !projectId) {
    throw createError({ statusCode: 400, statusMessage: 'hubId and projectId are required' })
  }

  const token = getApsAccessToken(event)

  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const send = (data: Record<string, unknown>) => {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    // Fetch top folders
    const topFoldersResponse = await apsFetch<{ data: Array<{ id: string, type: string, attributes: { displayName?: string, name?: string } }> }>(
      token,
      `/project/v1/hubs/${hubId}/projects/${projectId}/topFolders`
    )

    const topFolders = topFoldersResponse.data
      .filter(item => item.type === 'folders')
      .map(item => ({
        id: item.id,
        path: item.attributes.displayName || item.attributes.name || 'Unnamed'
      }))

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
      projectId as string,
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
