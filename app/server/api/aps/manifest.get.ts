import type { ApsManifest } from '~/types/derivatives'
import { filterPdfDerivatives, extractPdfViewSets, checkRevitVersion } from '../../utils/derivatives'

export default eventHandler(async (event) => {
  const { urn } = getQuery(event)

  if (!urn) {
    throw createError({ statusCode: 400, statusMessage: 'urn is required' })
  }

  const token = await getApsAccessToken(event)

  const manifest = await apsFetch<ApsManifest>(
    token,
    `/modelderivative/v2/designdata/${urn}/manifest`
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

  const derivatives = filterPdfDerivatives(firstDerivative.children)
  const viewSets = extractPdfViewSets(derivatives)
  const { supported: revitVersionSupported, version: revitVersion } = checkRevitVersion(firstDerivative)

  return {
    modelName: firstDerivative.name,
    derivatives,
    viewSets,
    revitVersionSupported,
    revitVersion
  }
})
