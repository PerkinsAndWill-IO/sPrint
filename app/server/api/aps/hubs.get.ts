import type { ApsHub } from '~/types/aps'

interface ApsHubsRawResponse {
  data: Array<{ id: string, attributes: { name: string, region: string } }>
  meta?: {
    warnings?: Array<{ HttpStatusCode?: string, ErrorCode?: string, Title?: string, Detail?: string }>
  }
}

export default eventHandler(async (event) => {
  const token = getApsAccessToken(event)

  const response = await apsFetch<ApsHubsRawResponse>(token, '/project/v1/hubs')

  const hubs: ApsHub[] = response.data.map(hub => ({
    id: hub.id,
    name: hub.attributes.name,
    region: hub.attributes.region
  }))

  const warnings = (response.meta?.warnings || []).map(w => w.Detail || w.Title || 'Unknown warning')

  return { hubs, warnings }
})
