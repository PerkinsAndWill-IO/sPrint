import { normalizeItemUrn } from '../../utils/aps-item'

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
  const { projectId, itemId } = getQuery(event)

  if (!projectId || !itemId) {
    throw createError({ statusCode: 400, statusMessage: 'projectId and itemId are required' })
  }

  const token = getApsAccessToken(event)

  const response = await apsFetch<ApsTipResponse>(
    token,
    `/data/v1/projects/${projectId}/items/${itemId}/tip`
  )

  return normalizeItemUrn(response.data)
})
