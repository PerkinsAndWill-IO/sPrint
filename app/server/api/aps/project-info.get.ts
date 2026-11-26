import { normalizeApsRegion } from '#shared/aps/region'
import { normalizeFolderContents } from '../../utils/aps-normalize'
import { resolveProjectRegion } from '../../utils/aps-region'
import { validateApsId } from '../../utils/validation'

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const { folderId } = query

  if (!query.projectId) {
    throw createError({ statusCode: 400, statusMessage: 'projectId is required' })
  }
  const projectId = validateApsId(query.projectId as string)

  const log = useRequestTelemetry(event, { project_id: projectId, folder_id: folderId, external: true })
  const token = await getApsAccessToken(event)

  // Runs alongside the folder calls; never fails the request
  const regionPromise = resolveProjectRegion(token, projectId, normalizeApsRegion(query.regionHint), log)

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

  const { region, hubId } = await regionPromise

  return {
    projectId,
    folderId: folderId as string,
    folderName,
    region,
    hubId,
    contents: normalizeFolderContents(contentsResponse.data)
  }
})
