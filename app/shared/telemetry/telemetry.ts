/**
 * Logging and analytics port, shared by the browser and the Nitro server.
 *
 * App code talks only to `Telemetry`. Backends plug in as `TelemetryAdapter`s
 * (console, PostHog). Nothing outside an adapter imports a vendor SDK.
 */
import { scrubError, scrubProps } from './scrub'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type TelemetryProps = Record<string, unknown>

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

/** The port: what a telemetry backend implements. Inputs arrive already scrubbed. */
export interface TelemetryAdapter {
  /** Log lines below this level are not sent to this adapter. */
  minLevel: LogLevel
  log(level: LogLevel, message: string, context: TelemetryProps): void
  captureException(error: Error, context: TelemetryProps): void
  track(event: string, props: TelemetryProps): void
  identify?(userId: string, props: TelemetryProps): void
  reset?(): void
  flush?(): Promise<void>
}

/** What app code uses. Never throws. */
export interface Telemetry {
  debug(message: string, context?: TelemetryProps): void
  info(message: string, context?: TelemetryProps): void
  warn(message: string, context?: TelemetryProps): void
  error(message: string, context?: TelemetryProps): void
  captureException(error: unknown, context?: TelemetryProps): void
  track(event: string, props?: TelemetryProps): void
  identify(userId: string, props?: TelemetryProps): void
  reset(): void
  /** A logger that adds `context` to everything it sends. */
  child(context: TelemetryProps): Telemetry
  flush(): Promise<void>
}

function safely(fn: () => void) {
  try {
    fn()
  } catch {
    // Telemetry must never break the code it observes
  }
}

/** `base` overlaid with the defined values of `extra` (an undefined value never erases a bound one). */
function overlay(base: TelemetryProps, extra?: TelemetryProps): TelemetryProps {
  const out = { ...base }
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value !== undefined) out[key] = value
  }
  return out
}

export function createTelemetry(adapters: TelemetryAdapter[], baseContext: TelemetryProps = {}): Telemetry {
  const merge = (extra?: TelemetryProps) => scrubProps(overlay(baseContext, extra))

  const log = (level: LogLevel) => (message: string, context?: TelemetryProps) => {
    const targets = adapters.filter(a => LEVEL_RANK[level] >= LEVEL_RANK[a.minLevel])
    if (targets.length === 0) return
    const props = merge(context)
    for (const adapter of targets) safely(() => adapter.log(level, message, props))
  }

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    captureException(error, context) {
      const safe = scrubError(error)
      const props = merge(context)
      for (const adapter of adapters) safely(() => adapter.captureException(safe, props))
    },
    track(event, props) {
      const safe = merge(props)
      for (const adapter of adapters) safely(() => adapter.track(event, safe))
    },
    identify(userId, props) {
      const safe = scrubProps(props)
      for (const adapter of adapters) safely(() => adapter.identify?.(userId, safe))
    },
    reset() {
      for (const adapter of adapters) safely(() => adapter.reset?.())
    },
    child(context) {
      return createTelemetry(adapters, overlay(baseContext, context))
    },
    async flush() {
      await Promise.all(adapters.map(a => a.flush?.().catch(() => {})))
    }
  }
}

export interface TelemetryPlan {
  /** Send to PostHog (only when a project key is configured). */
  posthog: boolean
  /** Lowest level written to the console; `null` turns the console off. */
  consoleLevel: LogLevel | null
}

/**
 * Adapter selection. Console is the fallback whenever PostHog is not
 * configured. On the server the console stays on next to PostHog: stdout
 * lands in Vercel's runtime logs and cannot be lost the way an in-flight
 * HTTP batch can. In a production browser only warnings and errors reach
 * the console.
 */
export function planTelemetry(options: { key?: string | null, dev: boolean, side: 'client' | 'server' }): TelemetryPlan {
  const posthog = Boolean(options.key?.trim())
  if (options.dev) return { posthog, consoleLevel: 'debug' }
  if (!posthog) return { posthog, consoleLevel: 'info' }
  return { posthog, consoleLevel: options.side === 'server' ? 'info' : 'warn' }
}
