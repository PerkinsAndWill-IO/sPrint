import type { H3Event } from 'h3'
import type { Telemetry } from '#shared/telemetry/telemetry'
import { getServerTelemetry, markLogged, useRequestTelemetry } from './telemetry'

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

  const started = Date.now()
  const tokenResponse = await fetch(`${APS_BASE_URL}/authentication/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: tokenData.toString()
  })

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text().catch(() => '')
    useRequestTelemetry(event).warn('auth.refresh_failed', {
      aps_path: '/authentication/v2/token',
      aps_status: tokenResponse.status,
      ...parseApsError(body),
      duration_ms: Date.now() - started
    })
    // Refresh token is invalid — clear cookies and force re-login
    setCookie(event, 'aps_access_token', '', { maxAge: 0 })
    setCookie(event, 'aps_refresh_token', '', { maxAge: 0 })
    throw markLogged(createError({ statusCode: 401, statusMessage: 'Session expired, please log in again' }))
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

export function modelDerivativePath(path: string, region?: string): string {
  if (region === 'EMEA') {
    return path.replace('/modelderivative/v2/', '/modelderivative/v2/regions/eu/')
  }
  return path
}

export function regionHeader(region?: string): Record<string, string> {
  if (region && region !== 'US') {
    return { Region: region }
  }
  return {}
}

export function buildApsUrl(path: string): string {
  if (path.startsWith('http')) {
    const parsed = new URL(path)
    if (parsed.hostname !== 'developer.api.autodesk.com') {
      throw new Error(`Blocked request to non-APS domain: ${parsed.hostname}`)
    }
    return path
  }
  return `${APS_BASE_URL}${path}`
}

export function sanitizeApsError(statusCode: number, _detail: unknown): string {
  return `APS API error (${statusCode})`
}

export interface ApsErrorDetail {
  aps_error_code?: string
  aps_error_message?: string
}

/**
 * Pulls the error code and message out of an APS error body. APS services
 * answer in several shapes: JSON:API `errors[]` (Data Management),
 * `developerMessage`/`errorCode` (legacy), `code`/`message`, OAuth
 * `error`/`error_description`, and Model Derivative `diagnostic`.
 * Server-side logging only; the client still gets sanitizeApsError.
 */
export function parseApsError(body: unknown): ApsErrorDetail {
  let data = body
  if (typeof body === 'string') {
    try {
      data = JSON.parse(body)
    } catch {
      return body ? { aps_error_message: body.slice(0, 500) } : {}
    }
  }
  if (!data || typeof data !== 'object') return {}
  const d = data as Record<string, unknown>
  const first = Array.isArray(d.errors) ? d.errors[0] as Record<string, unknown> | undefined : undefined
  const str = (...values: unknown[]) => {
    const found = values.find(v => (typeof v === 'string' && v) || typeof v === 'number')
    return found === undefined ? undefined : String(found)
  }
  return {
    aps_error_code: str(first?.code, d.errorCode, d.code, d.error),
    aps_error_message: str(first?.detail, first?.title, d.developerMessage, d.userMessage, d.message, d.error_description, d.diagnostic, d.reason)
  }
}

/** Logs a failed APS call: warn for 4xx, error for 5xx and network failures. */
export function logApsFailure(log: Telemetry | undefined, context: { aps_status?: number } & Record<string, unknown>) {
  const logger = log ?? getServerTelemetry()
  if (!context.aps_status || context.aps_status >= 500) logger.error('aps.request_failed', context)
  else logger.warn('aps.request_failed', context)
}

/** APS path without the host, for logs. */
function apsPathOf(url: string): string {
  return url.startsWith(APS_BASE_URL) ? url.slice(APS_BASE_URL.length) : url
}

/**
 * GET an APS endpoint with the user's token. Every failure is logged with the
 * APS path, HTTP status, APS error code/message, region and duration; pass the
 * route's telemetry (useRequestTelemetry) so the line also carries the route,
 * user and hub/project ids. Callers see only the sanitized status.
 */
export async function apsFetch<T>(token: string, path: string, region?: string, log?: Telemetry): Promise<T> {
  const url = buildApsUrl(path)
  const started = Date.now()
  try {
    const result = await $fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...regionHeader(region)
      }
    }) as T
    log?.debug('aps.request', { aps_path: apsPathOf(url), region, duration_ms: Date.now() - started })
    return result
  } catch (err: unknown) {
    const fetchErr = err as { status?: number, data?: unknown, message?: string }
    const status = fetchErr.status || 502
    logApsFailure(log, {
      aps_path: apsPathOf(url),
      aps_status: fetchErr.status,
      ...parseApsError(fetchErr.data ?? fetchErr.message),
      region,
      duration_ms: Date.now() - started,
      network_error: fetchErr.status ? undefined : true
    })
    throw markLogged(createError({
      statusCode: status,
      statusMessage: sanitizeApsError(status, fetchErr.data)
    }))
  }
}
