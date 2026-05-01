import { validateUrn, validateDerivativeUrn, validateRegion, sanitizeHeaderFilename } from '../../utils/validation'

export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.urn || !query.derivativeUrn) {
    throw createError({ statusCode: 400, statusMessage: 'urn and derivativeUrn are required' })
  }

  const urn = validateUrn(query.urn as string)
  const derivativeUrnValue = validateDerivativeUrn(query.derivativeUrn as string)
  const region = validateRegion(query.region as string | undefined)
  const displayName = typeof query.name === 'string' ? query.name : undefined

  const token = await getApsAccessToken(event)

  const signedInfo = await getSignedDerivativeUrl(urn, derivativeUrnValue, token, region)
  const file = await downloadDerivative(signedInfo, derivativeUrnValue, displayName)

  const contentType = (query.mimeType as string) || inferMimeType(derivativeUrnValue)
  const isInline = contentType.startsWith('image/') || contentType === 'application/pdf' || contentType === 'application/json'
  const safeName = sanitizeHeaderFilename(file.name)

  setResponseHeaders(event, {
    'Content-Type': contentType,
    'Content-Disposition': `${isInline ? 'inline' : 'attachment'}; filename="${safeName}"`
  })

  return file.data
})
