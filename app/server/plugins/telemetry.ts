import type { H3Error } from 'h3'
import { getQuery } from 'h3'

/**
 * Logs every request that ends in an error and was not already logged at
 * its source (APS failures are logged in apsFetch with more detail).
 * Validation errors (zod) surface here, with the failing parameter.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.requestStartedAt = Date.now()
  })

  nitroApp.hooks.hook('error', (error, { event }) => {
    if (isLogged(error)) return
    const status = (error as H3Error).statusCode ?? 500
    // Unknown pages (bots, typos) are not worth a log line
    if (status === 404 && !event?.path.startsWith('/api/')) return
    const log = event ? useRequestTelemetry(event) : getServerTelemetry()
    const cause = (error as { cause?: unknown }).cause ?? error
    const startedAt = event?.context.requestStartedAt as number | undefined
    const validationIssues = zodIssues(cause)
    const context = {
      status,
      error_message: validationIssues ? 'Invalid request parameters' : error.message,
      query: event ? getQuery(event) : undefined,
      validation_issues: validationIssues,
      duration_ms: startedAt ? Date.now() - startedAt : undefined
    }
    if (status >= 500) {
      log.error('request.failed', context)
      log.captureException(cause, context)
    } else {
      log.warn('request.failed', context)
    }
  })

  nitroApp.hooks.hook('close', () => getServerTelemetry().flush())
})

function zodIssues(error: unknown): Array<{ path: string, message: string }> | undefined {
  if (!error || typeof error !== 'object' || (error as { name?: string }).name !== 'ZodError') return undefined
  const issues = (error as { issues?: Array<{ path: PropertyKey[], message: string }> }).issues
  return issues?.map(issue => ({ path: issue.path.map(String).join('.'), message: issue.message }))
}
