import type { LogLevel, TelemetryAdapter, TelemetryProps } from './telemetry'

/**
 * Console adapter: the default backend, and the fallback when PostHog is not
 * configured. `json` writes one line per entry (searchable in Vercel's
 * runtime logs); otherwise the context is passed as an object so browser
 * devtools can expand it.
 */
export function createConsoleAdapter(options: { minLevel: LogLevel, json: boolean }): TelemetryAdapter {
  const write = (level: LogLevel, message: string, context: TelemetryProps) => {
    if (options.json) {
      console[level](JSON.stringify({ level, msg: message, ...context }))
    } else if (Object.keys(context).length > 0) {
      console[level](`[sprint] ${message}`, context)
    } else {
      console[level](`[sprint] ${message}`)
    }
  }

  return {
    minLevel: options.minLevel,
    log: write,
    captureException(error, context) {
      write('error', 'exception', { ...context, error_name: error.name, error_message: error.message, stack: error.stack })
    },
    track(event, props) {
      if (options.minLevel === 'debug') write('debug', `event ${event}`, props)
    }
  }
}
