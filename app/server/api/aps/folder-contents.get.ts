import type { ApsFolderContent } from '~/types/aps'

export default eventHandler(async (event) => {
  const { projectId, folderId } = getQuery(event)

  if (!projectId || !folderId) {
    throw createError({ statusCode: 400, statusMessage: 'projectId and folderId are required' })
  }

  const token = getApsAccessToken(event)

  const response = await apsFetch<{ data: Array<{ id: string, type: string, attributes: { displayName?: string, name?: string } }> }>(
    token,
    `/data/v1/projects/${projectId}/folders/${folderId}/contents`
  )

  const contents: ApsFolderContent[] = response.data.map((item) => {
    const name = item.attributes.displayName || item.attributes.name || 'Unnamed'
    return {
      id: item.id,
      name,
      type: item.type === 'folders' ? 'folders' as const : 'items' as const,
      isRevitFile: name.toLowerCase().endsWith('.rvt')
    }
  })

  return contents
})
