import type { ApsProject } from '~/types/aps'
import { validateApsId } from '../../utils/validation'

export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.hubId) {
    throw createError({ statusCode: 400, statusMessage: 'hubId is required' })
  }

  const hubId = validateApsId(query.hubId as string)

  const token = await getApsAccessToken(event)

  const response = await apsFetch<{ data: Array<{ id: string, attributes: { name: string } }> }>(
    token,
    `/project/v1/hubs/${hubId}/projects`
  )

  const projects: ApsProject[] = response.data.map(project => ({
    id: project.id,
    name: project.attributes.name,
    hubId
  }))

  return projects
})
