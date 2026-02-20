import type { ApsFolderContent } from '~/types/aps'

export default eventHandler(async (event) => {
  const { hubId, projectId } = getQuery(event)

  if (!hubId || !projectId) {
    throw createError({ statusCode: 400, statusMessage: 'hubId and projectId are required' })
  }

  const token = await getApsAccessToken(event)

  const response = await apsFetch<{ data: Array<{ id: string, type: string, attributes: { displayName?: string, name?: string } }> }>(
    token,
    `/project/v1/hubs/${hubId}/projects/${projectId}/topFolders`
  )

  const folders: ApsFolderContent[] = response.data.map(item => ({
    id: item.id,
    name: item.attributes.displayName || item.attributes.name || 'Unnamed',
    type: item.type === 'folders' ? 'folders' : 'items',
    isRevitFile: false
  }))

  return folders
})
