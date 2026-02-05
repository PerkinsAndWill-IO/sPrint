export default eventHandler(async (event) => {
  const accessToken = getCookie(event, 'aps_access_token')
  
  return {
    authenticated: !!accessToken
  }
})
