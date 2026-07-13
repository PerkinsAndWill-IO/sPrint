import type { ApsManifest } from '~/types/derivatives'
import { normalizeManifestResponse, emptyManifestResponse } from '../../utils/derivatives'
import { validateUrn, validateRegion } from '../../utils/validation'

export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.urn) {
    throw createError({ statusCode: 400, statusMessage: 'urn is required' })
  }

  const urn = validateUrn(query.urn as string)
  const region = validateRegion(query.region as string | undefined)

  const token = await getApsAccessToken(event)

  let manifest: ApsManifest
  try {
    manifest = await apsFetch<ApsManifest>(
      token,
      modelDerivativePath(`/modelderivative/v2/designdata/${urn}/manifest`, region),
      region
    )
  } catch (err) {
    // No manifest = model has no published derivatives; a valid empty state,
    // not a server error
    if ((err as { statusCode?: number }).statusCode === 404) {
      console.info(`[manifest] 404 from APS — no manifest/published derivatives (urn=${urn.slice(0, 24)}..., region=${region || 'US'})`)
      return emptyManifestResponse()
    }
    // Unexpected APS/server error — propagate (auth handling relies on status)
    throw err
  }

  return normalizeManifestResponse(manifest)
})
