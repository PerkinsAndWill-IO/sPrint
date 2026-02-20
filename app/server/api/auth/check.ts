export default eventHandler(async (event) => {
  const accessToken = getCookie(event, 'aps_access_token')
  const refreshToken = getCookie(event, 'aps_refresh_token')

  return {
    authenticated: !!(accessToken || refreshToken)
  }
})
