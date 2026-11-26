import posthog from 'posthog-js'
import type { CaptureResult, LogAttributes } from 'posthog-js'
import type { TelemetryAdapter } from '#shared/telemetry/telemetry'
import { scrubString } from '#shared/telemetry/scrub'

/**
 * PostHog adapter for the browser. Log lines go to PostHog Logs
 * (`captureLog`), errors to Error Tracking (`captureException`), product
 * events to `capture`. The only module in `app/` that imports posthog-js.
 */
export function createPostHogBrowserAdapter(options: { key: string, host: string, release?: string }): TelemetryAdapter {
  posthog.init(options.key, {
    api_host: options.host,
    // SPA pageviews on route change; no click/input autocapture, no recordings
    capture_pageview: 'history_change',
    autocapture: false,
    disable_session_recording: true,
    capture_exceptions: true,
    person_profiles: 'identified_only',
    logs: { captureConsoleLogs: false },
    before_send: scrubEvent
  })
  if (options.release) posthog.register({ app_release: options.release })

  return {
    minLevel: 'info',
    log(level, message, context) {
      // Values are JSON-safe after scrubbing
      posthog.captureLog({ body: message, level, attributes: context as LogAttributes })
    },
    captureException(error, context) {
      posthog.captureException(error, context)
    },
    track(event, props) {
      posthog.capture(event, props)
    },
    identify(userId, props) {
      posthog.identify(userId, props)
    },
    reset() {
      posthog.reset()
    }
  }
}

/**
 * Safety net for events the SDK builds itself (pageviews, autocaptured
 * exceptions): scrub string properties and exception messages. Properties
 * from our own calls were already scrubbed by the Telemetry facade.
 */
function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event
  const properties: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(event.properties ?? {})) {
    properties[key] = typeof value === 'string' ? scrubString(value) : value
  }
  if (Array.isArray(properties.$exception_list)) {
    properties.$exception_list = properties.$exception_list.map(e =>
      typeof e?.value === 'string' ? { ...e, value: scrubString(e.value) } : e)
  }
  return { ...event, properties }
}
