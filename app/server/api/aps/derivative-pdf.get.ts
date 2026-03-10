export default eventHandler(async (event) => {
  const { urn, derivativeUrn, region } = getQuery(event)

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

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${file.name}"`
  })

  return file.data
})
