import type { H3Event } from 'h3'
import { getCookie } from 'h3'
import { createTelemetry, planTelemetry, type Telemetry, type TelemetryAdapter, type TelemetryProps } from '#shared/telemetry/telemetry'
import { createConsoleAdapter } from '#shared/telemetry/console-adapter'
import { createPostHogNodeAdapter } from '../telemetry/posthog-adapter'

let instance: Telemetry | undefined

function readConfig(): { key?: string, host?: string, release?: string, environment?: string } {
  try {
    const { public: pub } = useRuntimeConfig()
    return { key: pub.posthogKey, host: pub.posthogHost, release: pub.appRelease, environment: pub.appEnv }
  } catch {
    // Outside a Nitro runtime (unit tests): console only
    return {}
  }
}

/** Process-wide server telemetry: console always, plus PostHog when a key is set. */
export function getServerTelemetry(): Telemetry {
  if (instance) return instance
  const config = readConfig()
  const plan = planTelemetry({ key: config.key, dev: Boolean(import.meta.dev), side: 'server' })
  const adapters: TelemetryAdapter[] = []
  if (plan.consoleLevel) adapters.push(createConsoleAdapter({ minLevel: plan.consoleLevel, json: !import.meta.dev }))
  if (plan.posthog && config.key) {
    adapters.push(createPostHogNodeAdapter({
      key: config.key.trim(),
      host: config.host || 'https://us.i.posthog.com',
      release: config.release,
      environment: config.environment
    }))
  }
  instance = createTelemetry(adapters, { side: 'server', release: config.release, env: config.environment })
  return instance
}

/**
 * Reads the Autodesk user id from an APS access token. APS v2 access tokens
 * are JWTs with a `userid` claim. Attribution only: the token is not
 * verified here, and it is never logged.
 */
export function apsUserIdFromToken(token: string | undefined): string | undefined {
  const payload = token?.split('.')[1]
  if (!payload) return undefined
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userid?: unknown }
    return typeof claims.userid === 'string' ? claims.userid : undefined
  } catch {
    return undefined
  }
}

/**
 * Telemetry bound to the current request: route, method and the signed-in
 * Autodesk user. Extra context (hub_id, project_id, region) sticks to the
 * request, so later lines (including the error hook's) carry it too.
 */
export function useRequestTelemetry(event: H3Event, context?: TelemetryProps): Telemetry {
  let base = event.context.telemetry as Telemetry | undefined
  if (!base) {
    base = getServerTelemetry().child({
      route: event.path.split('?')[0],
      method: event.method,
      user_id: apsUserIdFromToken(getCookie(event, 'aps_access_token'))
    })
    event.context.telemetry = base
  }
  if (context) {
    base = base.child(context)
    event.context.telemetry = base
  }
  return base
}

const LOGGED = Symbol.for('sprint.telemetry.logged')

/** Marks an error as already logged so the Nitro error hook skips it. */
export function markLogged<T extends object>(error: T): T {
  Object.defineProperty(error, LOGGED, { value: true })
  return error
}

export function isLogged(error: unknown): boolean {
  const has = (e: unknown) => typeof e === 'object' && e !== null && LOGGED in e
  // h3 wraps thrown errors, so also look one level down
  return has(error) || has((error as { cause?: unknown } | null)?.cause)
}
