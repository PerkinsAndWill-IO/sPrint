export default eventHandler(async (event) => {
  try {
    await getApsAccessToken(event)
    return { authenticated: true }
  } catch {
    return { authenticated: false }
  }
})
