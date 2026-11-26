import { createTelemetry, type Telemetry, type TelemetryProps } from '#shared/telemetry/telemetry'
import { createConsoleAdapter } from '#shared/telemetry/console-adapter'

// Console-only until the telemetry plugin swaps in the configured instance
// (and for SSR, where the browser plugin never runs)
let current: Telemetry = createTelemetry([createConsoleAdapter({ minLevel: import.meta.dev ? 'debug' : 'info', json: false })])

/** App-wide logger and analytics. Safe outside components and setup. */
export function useTelemetry(): Telemetry {
  return current
}

export function setTelemetry(telemetry: Telemetry) {
  current = telemetry
}

/** HTTP status of a failed `$fetch`/`api` call, if it got a response. */
export function errorStatus(error: unknown): number | undefined {
  const e = error as { statusCode?: unknown, status?: unknown } | null
  const status = e?.statusCode ?? e?.status
  return typeof status === 'number' ? status : undefined
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Reports a failed user action: a log line `name` (e.g. `tree.load_failed`)
 * with the error, and the product event `tree_load_failed` without it.
 */
export function reportFailure(name: string, context: TelemetryProps, error?: unknown, level: 'warn' | 'error' = 'warn') {
  const telemetry = useTelemetry()
  const props = { ...context, status: errorStatus(error) }
  telemetry[level](name, { ...props, error_message: error === undefined ? undefined : errorMessage(error) })
  telemetry.track(name.replace(/\./g, '_'), props)
}
