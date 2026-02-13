import { randomBytes } from 'node:crypto'

export default eventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const clientId = config.apsClientId
  const redirectUri = config.apsRedirectUri

  if (!clientId || !redirectUri) {
    throw createError({
      statusCode: 500,
      message: 'APS configuration missing'
    })
  }

  // Generate state for CSRF protection
  const state = randomBytes(32).toString('hex')
  
  // Store state in cookie for validation in callback
  setCookie(event, 'aps_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })

  // Build Autodesk authorization URL
  const authUrl = new URL('https://developer.api.autodesk.com/authentication/v2/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'data:read account:read')
  authUrl.searchParams.set('state', state)

  return {
    authUrl: authUrl.toString()
  }
})
