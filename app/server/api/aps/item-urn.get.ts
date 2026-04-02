import { normalizeItemUrn } from '../../utils/aps-item'
import { validateApsId } from '../../utils/validation'

interface ApsTipResponse {
  data: {
    id: string
    type: string
    attributes: {
      displayName?: string
      name?: string
      versionNumber?: number
    }
  }
}

export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.projectId || !query.itemId) {
    throw createError({ statusCode: 400, statusMessage: 'projectId and itemId are required' })
  }

  const projectId = validateApsId(query.projectId as string)
  const itemId = validateApsId(query.itemId as string)

  const token = await getApsAccessToken(event)

  const response = await apsFetch<ApsTipResponse>(
    token,
    `/data/v1/projects/${projectId}/items/${itemId}/tip`
  )

  return normalizeItemUrn(response.data)
})
