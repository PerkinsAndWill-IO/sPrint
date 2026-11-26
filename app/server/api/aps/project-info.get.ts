import { normalizeFolderContents } from '../../utils/aps-normalize'

export default eventHandler(async (event) => {
  const { projectId, folderId } = getQuery(event)

  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'projectId is required' })
  }

  const log = useRequestTelemetry(event, { project_id: projectId, folder_id: folderId, external: true })
  const token = await getApsAccessToken(event)

  // Get folder info if folderId is provided
  let folderName = 'External Project'
  if (folderId) {
    const folderResponse = await apsFetch<{ data: { attributes: { displayName?: string, name?: string } } }>(
      token,
      `/data/v1/projects/${projectId}/folders/${folderId}`,
      undefined,
      log
    )
    folderName = folderResponse.data.attributes.displayName || folderResponse.data.attributes.name || 'External Project'
  }

  // Get folder contents
  const contentsResponse = await apsFetch<{ data: Array<{ id: string, type: string, attributes: { displayName?: string, name?: string } }> }>(
    token,
    `/data/v1/projects/${projectId}/folders/${folderId}/contents`,
    undefined,
    log
  )

  return {
    projectId: projectId as string,
    folderId: folderId as string,
    folderName,
    contents: normalizeFolderContents(contentsResponse.data)
  }
})
