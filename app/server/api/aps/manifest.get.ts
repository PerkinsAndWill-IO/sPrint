import type { ApsManifest } from '~/types/derivatives'
import { normalizeManifestResponse, emptyManifestResponse } from '../../utils/derivatives'
import { validateUrn, validateRegion } from '../../utils/validation'

export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.urn) {
    throw createError({ statusCode: 400, statusMessage: 'urn is required' })
  }

  const log = useRequestTelemetry(event, { region: query.region })
  const urn = validateUrn(query.urn as string)
  const region = validateRegion(query.region as string | undefined)

  const token = await getApsAccessToken(event)

  let manifest: ApsManifest
  try {
    manifest = await apsFetch<ApsManifest>(
      token,
      modelDerivativePath(`/modelderivative/v2/designdata/${urn}/manifest`, region),
      region,
      log
    )
  } catch (err) {
    // No manifest = model has no published derivatives; a valid empty state,
    // not a server error
    if ((err as { statusCode?: number }).statusCode === 404) {
      log.info('aps.manifest_missing', { urn_prefix: urn.slice(0, 24) })
      return emptyManifestResponse()
    }
    // Unexpected APS/server error — propagate (auth handling relies on status)
    throw err
  }

  return normalizeManifestResponse(manifest, log)
})
