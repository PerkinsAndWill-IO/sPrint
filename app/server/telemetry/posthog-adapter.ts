import { randomUUID } from 'node:crypto'
import { PostHog } from 'posthog-node'
import { waitUntil } from '@vercel/functions'
import type { TelemetryAdapter } from '#shared/telemetry/telemetry'

/**
 * PostHog adapter for the Nitro server. The only server module that imports
 * posthog-node.
 *
 * - Log lines go to PostHog Logs (`captureLog`), exceptions to Error Tracking.
 * - The person is the Autodesk user id passed in the `user_id` context key.
 * - Vercel freezes a function once its response is sent, so in-memory batches
 *   would be lost. `waitUntil` lets the SDK flush shortly after the last
 *   capture while Vercel keeps the function alive. Nothing is awaited in the
 *   request path, so requests get no extra latency. Outside Vercel it is a
 *   no-op and the SDK's own timer flushes.
 */
type LogAttributes = Parameters<PostHog['captureLog']>[0]['attributes']

export function createPostHogNodeAdapter(options: { key: string, host: string, release?: string, environment?: string }): TelemetryAdapter {
  const client = new PostHog(options.key, {
    host: options.host,
    waitUntil,
    logs: { serviceName: 'sprint-server', serviceVersion: options.release, environment: options.environment }
  })
  client.on('error', () => {
    // Delivery failures must not surface as unhandled errors in the app
  })

  const distinctIdOf = (context: Record<string, unknown>) =>
    typeof context.user_id === 'string' && context.user_id ? context.user_id : undefined

  return {
    minLevel: 'info',
    log(level, message, context) {
      const distinctId = distinctIdOf(context)
      client.captureLog({
        body: message,
        level,
        // Values are JSON-safe after scrubbing
        attributes: (distinctId ? { ...context, posthogDistinctId: distinctId } : context) as LogAttributes
      })
    },
    captureException(error, context) {
      client.captureException(error, distinctIdOf(context), context)
    },
    track(event, props) {
      const distinctId = distinctIdOf(props)
      client.capture({
        distinctId: distinctId ?? randomUUID(),
        event,
        properties: distinctId ? props : { ...props, $process_person_profile: false }
      })
    },
    flush: () => client.flush()
  }
}
