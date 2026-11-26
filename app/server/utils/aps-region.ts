import type { Telemetry } from '#shared/telemetry/telemetry'
import { normalizeApsRegion, type ApsRegion } from '#shared/aps/region'
import { apsFetch, apsTryFetch } from './aps'
import { normalizeHubs } from './aps-normalize'

export interface ResolvedRegion {
  /** Undefined = unknown; APS then defaults to US */
  region?: ApsRegion
  hubId?: string
  /** hub: the hub's own `region` attribute; url: the pasted link's host */
  source: 'hub' | 'url' | 'none'
}

// A user is rarely in more than a handful of hubs; this bounds the probes
const MAX_HUBS_PROBED = 25

interface ApsHubResponse {
  data: { id: string, attributes: { name?: string, region?: string } }
}

/**
 * Region of a hub, from the `region` attribute Data Management returns for
 * every hub entity:
 * https://aps.autodesk.com/en/docs/data/v2/reference/http/hubs-hub_id-GET
 */
export async function resolveHubRegion(token: string, hubId: string, log?: Telemetry): Promise<ResolvedRegion> {
  const started = Date.now()
  const hub = await apsFetch<ApsHubResponse>(token, `/project/v1/hubs/${hubId}`, undefined, log)
  const raw = hub.data.attributes.region
  const region = normalizeApsRegion(raw)
  const result: ResolvedRegion = { region, hubId, source: region ? 'hub' : 'none' }
  logResolution(log, result, { hub_id: hubId, region_raw: region ? undefined : raw, duration_ms: Date.now() - started })
  return result
}

/**
 * Region of a project known only by id (a pasted ACC/BIM 360 link). Data
 * Management keeps the region on the hub, so this finds the user's hub that
 * holds the project and reads its region. When no hub answers (the hub list
 * fails, or the project's hub is not visible to sPrint), the link's host
 * (`hint`) is used instead.
 */
export async function resolveProjectRegion(token: string, projectId: string, hint: ApsRegion | undefined, log?: Telemetry): Promise<ResolvedRegion> {
  const started = Date.now()
  let hubsChecked = 0
  let ownerHubId: string | undefined
  let ownerRegionRaw: string | undefined
  try {
    const list = await apsFetch<{ data: Array<{ id: string, attributes: { name: string, region: string } }> }>(token, '/project/v1/hubs', undefined, log)
    const hubs = normalizeHubs(list.data).filter(h => h.id.startsWith('b.')).slice(0, MAX_HUBS_PROBED)
    hubsChecked = hubs.length
    const probes = await Promise.all(hubs.map(async (hub) => {
      const project = await apsTryFetch<unknown>(token, `/project/v1/hubs/${hub.id}/projects/${projectId}`, log)
      return project ? hub : undefined
    }))
    const owner = probes.find(h => h !== undefined)
    const region = normalizeApsRegion(owner?.region)
    if (owner && region) {
      const result: ResolvedRegion = { region, hubId: owner.id, source: 'hub' }
      logResolution(log, result, { project_id: projectId, region_hint: hint, hubs_checked: hubsChecked, duration_ms: Date.now() - started })
      return result
    }
    if (owner) {
      ownerHubId = owner.id
      ownerRegionRaw = owner.region
    }
  } catch {
    // apsFetch already logged the failure; fall back to the link's host
  }
  const result: ResolvedRegion = { region: hint, hubId: ownerHubId, source: hint ? 'url' : 'none' }
  logResolution(log, result, { project_id: projectId, region_hint: hint, region_raw: ownerRegionRaw, hubs_checked: hubsChecked, duration_ms: Date.now() - started })
  return result
}

function logResolution(log: Telemetry | undefined, result: ResolvedRegion, context: Record<string, unknown>) {
  if (!log) return
  const props = { ...context, region: result.region, hub_id: result.hubId ?? context.hub_id, source: result.source }
  if (result.source === 'none') log.warn('aps.region_unresolved', { ...props, fallback: 'US' })
  else log.info('aps.region_resolved', props)
}
