import { normalizeHubs, normalizeWarnings } from '../../utils/aps-normalize'

interface ApsHubsRawResponse {
  data: Array<{ id: string, attributes: { name: string, region: string } }>
  meta?: {
    warnings?: Array<{ HttpStatusCode?: string, ErrorCode?: string, Title?: string, Detail?: string }>
  }
}

export default eventHandler(async (event) => {
  const log = useRequestTelemetry(event)
  const token = await getApsAccessToken(event)

  const response = await apsFetch<ApsHubsRawResponse>(token, '/project/v1/hubs', undefined, log)

  const hubs = normalizeHubs(response.data)
  const warnings = normalizeWarnings(response.meta?.warnings)

  // Hubs the user cannot reach (e.g. sPrint not added as a custom
  // integration there) come back as warnings, not errors
  if (response.meta?.warnings?.length) {
    log.warn('aps.hubs_warnings', {
      hub_count: hubs.length,
      warnings: response.meta.warnings
    })
  }
  log.info('aps.hubs_listed', {
    hub_count: hubs.length,
    warning_count: warnings.length,
    regions: [...new Set(hubs.map(h => h.region))]
  })

  return { hubs, warnings }
})
