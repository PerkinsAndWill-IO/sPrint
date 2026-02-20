export default eventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const query = getQuery(event)
  const code = query.code as string
  const state = query.state as string
  const error = query.error as string | undefined

  // Check for OAuth error
  if (error) {
    throw createError({
      statusCode: 400,
      message: `OAuth error: ${error}`
    })
  }

  // Validate state
  const storedState = getCookie(event, 'aps_oauth_state')
  if (!storedState || storedState !== state) {
    throw createError({
      statusCode: 400,
      message: 'Invalid state parameter'
    })
  }

  // Clear state cookie
  setCookie(event, 'aps_oauth_state', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0
  })

  if (!code) {
    throw createError({
      statusCode: 400,
      message: 'Authorization code missing'
    })
  }

  const clientId = config.apsClientId
  const clientSecret = config.apsClientSecret
  const redirectUri = config.apsRedirectUri

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({
      statusCode: 500,
      message: 'APS configuration missing'
    })
  }

  // Exchange authorization code for tokens
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const tokenData = new URLSearchParams()
  tokenData.append('grant_type', 'authorization_code')
  tokenData.append('code', code)
  tokenData.append('redirect_uri', redirectUri)

  try {
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: tokenData.toString()
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[APS Callback] Token exchange failed:', {
        status: tokenResponse.status,
        error: errorData,
        redirectUri,
        clientId: clientId?.substring(0, 8) + '...',
        codeLength: code?.length
      })
      throw createError({
        statusCode: tokenResponse.status,
        message: `Token exchange failed: ${errorData.error_description || errorData.error || 'Unknown error'}`
      })
    }

    const tokens = await tokenResponse.json()

    const expiresIn = tokens.expires_in || 3600
    const maxAge = expiresIn - 60

    setCookie(event, 'aps_access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: maxAge
    })

    setCookie(event, 'aps_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    // Flag for client-side login tracking
    setCookie(event, 'aps_just_logged_in', '1', {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60
    })

    // Redirect to dashboard after successful authentication
    return sendRedirect(event, '/dashboard', 302)
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      message: `Failed to exchange token: ${err.message}`
    })
  }
})
