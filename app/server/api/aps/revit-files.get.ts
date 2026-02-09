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

    const queue: Array<{ id: string, path: string }> = topFoldersResponse.data
      .filter(item => item.type === 'folders')
      .map(item => ({
        id: item.id,
        path: item.attributes.displayName || item.attributes.name || 'Unnamed'
      }))

    let scanned = 0
    let totalFiles = 0

    // BFS through all folders
    while (queue.length > 0) {
      const folder = queue.shift()!
      scanned++

      send({ type: 'progress', folder: folder.path, scanned })

      try {
        let nextUrl: string | null = `/data/v1/projects/${projectId}/folders/${folder.id}/contents`

        while (nextUrl) {
          const response = await apsFetch<{
            data: Array<{ id: string, type: string, attributes: { displayName?: string, name?: string } }>
            links?: { next?: { href: string } }
          }>(token, nextUrl)

          for (const item of response.data) {
            const name = item.attributes.displayName || item.attributes.name || 'Unnamed'

            if (item.type === 'folders') {
              queue.push({ id: item.id, path: `${folder.path}/${name}` })
            } else if (name.toLowerCase().endsWith('.rvt')) {
              totalFiles++
              send({ type: 'file', name, id: item.id, path: folder.path })
            }
          }

          nextUrl = response.links?.next?.href || null
        }
      } catch {
        // Skip folders we can't access and continue traversal
      }

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    send({ type: 'done', total: totalFiles })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    send({ type: 'error', message })
  }

  event.node.res.end()
})
