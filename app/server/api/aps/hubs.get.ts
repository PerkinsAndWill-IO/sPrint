import { normalizeHubs, normalizeWarnings } from '../../utils/aps-normalize'

interface ApsHubsRawResponse {
  data: Array<{ id: string, attributes: { name: string, region: string } }>
  meta?: {
    warnings?: Array<{ HttpStatusCode?: string, ErrorCode?: string, Title?: string, Detail?: string }>
  }
}

export default eventHandler(async (event) => {
  const token = getApsAccessToken(event)

  const response = await apsFetch<ApsHubsRawResponse>(token, '/project/v1/hubs')

  const hubs = normalizeHubs(response.data)
  const warnings = normalizeWarnings(response.meta?.warnings)

  return { hubs, warnings }
})
