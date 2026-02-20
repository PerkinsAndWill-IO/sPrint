export default eventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const state = query.state as string
  const error = query.error as string | undefined

  // Check for OAuth error
  if (error) {
    return sendRedirect(event, `/?error=${encodeURIComponent(error)}`, 302)
  }

  // Validate state
  const storedState = getCookie(event, 'aps_oauth_state')
  if (!storedState || storedState !== state) {
    return sendRedirect(event, '/?error=invalid_state', 302)
  }

  // Clear state cookie
  setCookie(event, 'aps_oauth_state', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0
  })

  if (!code) {
    return sendRedirect(event, '/?error=missing_code', 302)
  }

  // Store code in a temporary cookie for the client to exchange
  setCookie(event, 'aps_auth_code', code, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60,
    path: '/'
  })

  // Redirect to client page that will exchange the code via POST
  return sendRedirect(event, '/auth/callback', 302)
})
