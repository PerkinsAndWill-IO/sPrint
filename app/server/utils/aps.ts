import type { H3Event } from 'h3'

const APS_BASE_URL = 'https://developer.api.autodesk.com'

async function refreshAccessToken(event: H3Event): Promise<string> {
  const refreshToken = getCookie(event, 'aps_refresh_token')
  if (!refreshToken) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const config = useRuntimeConfig(event)
  const clientId = config.apsClientId
  const clientSecret = config.apsClientSecret

  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'APS configuration missing' })
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const tokenData = new URLSearchParams()
  tokenData.append('grant_type', 'refresh_token')
  tokenData.append('refresh_token', refreshToken)

  const tokenResponse = await fetch(`${APS_BASE_URL}/authentication/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: tokenData.toString()
  })

  if (!tokenResponse.ok) {
    // Refresh token is invalid — clear cookies and force re-login
    setCookie(event, 'aps_access_token', '', { maxAge: 0 })
    setCookie(event, 'aps_refresh_token', '', { maxAge: 0 })
    throw createError({ statusCode: 401, statusMessage: 'Session expired, please log in again' })
  }

  const tokens = await tokenResponse.json()
  const expiresIn = tokens.expires_in || 3600

  setCookie(event, 'aps_access_token', tokens.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: expiresIn - 60
  })

  if (tokens.refresh_token) {
    setCookie(event, 'aps_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    })
  }

  return tokens.access_token
}

export async function getApsAccessToken(event: H3Event): Promise<string> {
  const token = getCookie(event, 'aps_access_token')
  if (token) {
    return token
  }
  // Access token expired — try refreshing
  return await refreshAccessToken(event)
}

export async function apsFetch<T>(token: string, path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${APS_BASE_URL}${path}`
  return await $fetch<T>(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}
