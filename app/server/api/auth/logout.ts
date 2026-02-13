export default eventHandler(async (event) => {
  // Clear authentication cookies
  setCookie(event, 'aps_access_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0
  })

  setCookie(event, 'aps_refresh_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0
  })

  return {
    success: true
  }
})
