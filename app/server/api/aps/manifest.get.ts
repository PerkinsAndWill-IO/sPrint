import type { ApsManifest } from '~/types/derivatives'
import { filterDerivatives, extractViewSets, checkRevitVersion } from '../../utils/derivatives'
import { validateUrn, validateRegion } from '../../utils/validation'

export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.urn) {
    throw createError({ statusCode: 400, statusMessage: 'urn is required' })
  }

  const urn = validateUrn(query.urn as string)
  const region = validateRegion(query.region as string | undefined)

  const token = await getApsAccessToken(event)

  const manifest = await apsFetch<ApsManifest>(
    token,
    modelDerivativePath(`/modelderivative/v2/designdata/${urn}/manifest`, region),
    region
  )

  const firstDerivative = manifest.derivatives[0]
  if (!firstDerivative) {
    return {
      modelName: 'Unknown',
      derivatives: [],
      viewSets: [],
      revitVersionSupported: false,
      revitVersion: null
    }
  }

  const derivatives = filterDerivatives(firstDerivative.children)
  const viewSets = extractViewSets(derivatives)
  const { supported: revitVersionSupported, version: revitVersion } = checkRevitVersion(firstDerivative)

  return {
    modelName: firstDerivative.name,
    derivatives,
    viewSets,
    revitVersionSupported,
    revitVersion
  }
})
