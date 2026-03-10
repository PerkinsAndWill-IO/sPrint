export default eventHandler(async (event) => {
  const { urn, derivativeUrn, mimeType, region } = getQuery(event)

  if (!urn || !derivativeUrn) {
    throw createError({ statusCode: 400, statusMessage: 'urn and derivativeUrn are required' })
  }

  const token = await getApsAccessToken(event)

  const signedInfo = await getSignedDerivativeUrl(
    urn as string,
    derivativeUrn as string,
    token,
    region as string | undefined
  )

  const file = await downloadDerivative(signedInfo, derivativeUrn as string)

  const contentType = (mimeType as string) || inferMimeType(derivativeUrn as string)
  const isInline = contentType.startsWith('image/') || contentType === 'application/pdf' || contentType === 'application/json'

  setResponseHeaders(event, {
    'Content-Type': contentType,
    'Content-Disposition': `${isInline ? 'inline' : 'attachment'}; filename="${file.name}"`
  })

  return file.data
})
