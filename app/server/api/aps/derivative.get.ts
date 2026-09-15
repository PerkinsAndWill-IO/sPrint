import { validateUrn, validateDerivativeUrn, validateRegion } from '../../utils/validation'

/**
 * Streams a single derivative (PDF, thumbnail, JSON, ...) from APS to the browser.
 *
 * The body is piped straight from CloudFront rather than buffered, so a 100 MB
 * sheet neither sits in server memory nor forces the browser to download all of
 * it before the PDF viewer can render the first page. Range requests are
 * forwarded so the browser's PDF viewer can page through large files lazily.
 */
export default eventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.urn || !query.derivativeUrn) {
    throw createError({ statusCode: 400, statusMessage: 'urn and derivativeUrn are required' })
  }

  const urn = validateUrn(query.urn as string)
  const derivativeUrnValue = validateDerivativeUrn(query.derivativeUrn as string)
  const region = validateRegion(query.region as string | undefined)
  const displayName = typeof query.name === 'string' ? query.name : undefined

  const startedAt = Date.now()
  let upstream: Awaited<ReturnType<typeof openDerivativeStream>>
  try {
    const token = await getApsAccessToken(event)
    const signedInfo = await getSignedDerivativeUrl(urn, derivativeUrnValue, token, region)
    upstream = await openDerivativeStream(signedInfo, getRequestHeader(event, 'range'))
  } catch (err) {
    // Answer with our own JSON body instead of rethrowing: Nitro's error handler
    // forces X-Frame-Options: DENY, which would leave the preview iframe blank
    // rather than letting it read and display this message.
    const statusCode = isError(err) ? err.statusCode : 502
    const statusMessage = isError(err) ? err.statusMessage : 'Failed to fetch derivative from Autodesk'
    const detail = err instanceof Error ? err.message : String(err)
    console.error(`[derivative] failure (${statusCode}) after ${Date.now() - startedAt}ms for ${derivativeUrnValue}: ${detail}`)
    setResponseStatus(event, statusCode, statusMessage)
    return { statusCode, statusMessage }
  }

  const contentType = (query.mimeType as string) || inferMimeType(derivativeUrnValue)
  const isInline = contentType.startsWith('image/') || contentType === 'application/pdf' || contentType === 'application/json'
  const fileName = deriveFileName(derivativeUrnValue, displayName)

  setResponseStatus(event, upstream.status)
  setResponseHeaders(event, {
    ...upstream.headers,
    'Content-Type': contentType,
    'Content-Disposition': buildContentDisposition(isInline ? 'inline' : 'attachment', fileName),
    'Cache-Control': 'private, no-store'
  })

  return sendStream(event, upstream.stream)
})
