import { normalizeFolderContents } from '../../utils/aps-normalize'

export default eventHandler(async (event) => {
  const { projectId, folderId } = getQuery(event)

  if (!projectId || !folderId) {
    throw createError({ statusCode: 400, statusMessage: 'projectId and folderId are required' })
  }

  const token = await getApsAccessToken(event)

  const response = await apsFetch<{ data: Array<{ id: string, type: string, attributes: { displayName?: string, name?: string } }> }>(
    token,
    `/data/v1/projects/${projectId}/folders/${folderId}/contents`
  )

  return normalizeFolderContents(response.data)
})
