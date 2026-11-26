import { normalizeApsRegion } from '#shared/aps/region'
import { resolveHubRegion, resolveProjectRegion } from '../../utils/aps-region'
import { validateApsId } from '../../utils/validation'

/**
 * Region of a manually added hub (`hubId`) or of a project added by link
 * (`projectId`, with the link's region as `regionHint`). Used to fill in the
 * region of hubs and projects saved before sPrint stored one.
 */
export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.hubId && !query.projectId) {
    throw createError({ statusCode: 400, statusMessage: 'hubId or projectId is required' })
  }

  const hubId = query.hubId ? validateApsId(query.hubId as string) : undefined
  const projectId = query.projectId ? validateApsId(query.projectId as string) : undefined

  const log = useRequestTelemetry(event, { hub_id: hubId, project_id: projectId })
  const token = await getApsAccessToken(event)

  if (hubId) return await resolveHubRegion(token, hubId, log)
  return await resolveProjectRegion(token, projectId!, normalizeApsRegion(query.regionHint), log)
})
