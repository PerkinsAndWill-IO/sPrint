import { normalizeFolderContents } from '../../utils/aps-normalize'
import { validateApsId } from '../../utils/validation'

export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.projectId || !query.folderId) {
    throw createError({ statusCode: 400, statusMessage: 'projectId and folderId are required' })
  }

  const projectId = validateApsId(query.projectId as string)
  const folderId = validateApsId(query.folderId as string)

  const token = await getApsAccessToken(event)

  const response = await apsFetch<{ data: Array<{ id: string, type: string, attributes: { displayName?: string, name?: string } }> }>(
    token,
    `/data/v1/projects/${projectId}/folders/${folderId}/contents`
  )

  return normalizeFolderContents(response.data)
})
