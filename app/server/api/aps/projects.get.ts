import type { ApsProject } from '~/types/aps'

export default eventHandler(async (event) => {
  const { hubId } = getQuery(event)

  if (!hubId) {
    throw createError({ statusCode: 400, statusMessage: 'hubId is required' })
  }

  const token = getApsAccessToken(event)

  const response = await apsFetch<{ data: Array<{ id: string, attributes: { name: string } }> }>(
    token,
    `/project/v1/hubs/${hubId}/projects`
  )

  const projects: ApsProject[] = response.data.map(project => ({
    id: project.id,
    name: project.attributes.name,
    hubId: hubId as string
  }))

  return projects
})
