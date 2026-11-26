export default eventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const code = getCookie(event, 'aps_auth_code')
  const log = useRequestTelemetry(event)

  if (!code) {
    log.warn('auth.exchange_failed', { reason: 'missing_code_cookie' })
    throw createError({ statusCode: 400, message: 'No authorization code' })
  }

  // Clear the temporary code cookie
  setCookie(event, 'aps_auth_code', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })

  const clientId = config.apsClientId
  const clientSecret = config.apsClientSecret
  const redirectUri = config.apsRedirectUri

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({ statusCode: 500, message: 'APS configuration missing' })
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const tokenData = new URLSearchParams()
  tokenData.append('grant_type', 'authorization_code')
  tokenData.append('code', code)
  tokenData.append('redirect_uri', redirectUri)

  const started = Date.now()
  const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: tokenData.toString()
  })

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text().catch(() => '')
    log.error('auth.exchange_failed', {
      reason: 'token_request_failed',
      aps_path: '/authentication/v2/token',
      aps_status: tokenResponse.status,
      ...parseApsError(body),
      duration_ms: Date.now() - started
    })
    throw markLogged(createError({
      statusCode: tokenResponse.status,
      message: 'Token exchange failed'
    }))
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

  log.info('auth.signed_in', { user_id: apsUserIdFromToken(tokens.access_token), duration_ms: Date.now() - started })

  return { success: true }
})
