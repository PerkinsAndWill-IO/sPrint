// Compatibility alias — redirects to the generic derivative endpoint
export default eventHandler(async (event) => {
  const query = getQuery(event)
  const params = new URLSearchParams()
  if (query.urn) params.set('urn', query.urn as string)
  if (query.derivativeUrn) params.set('derivativeUrn', query.derivativeUrn as string)
  if (query.region) params.set('region', query.region as string)
  params.set('mimeType', 'application/pdf')
  return sendRedirect(event, `/api/aps/derivative?${params.toString()}`, 301)
})
