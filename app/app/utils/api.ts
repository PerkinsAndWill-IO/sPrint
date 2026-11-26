// Nuxt 4 auto-imports `$fetch` as a module binding captured at boot
// (`export const $fetch = globalThis.$fetch`), so reassigning
// `globalThis.$fetch` in a plugin never intercepts anything. Every client
// API call goes through this instance so a 401 (stale/revoked APS token)
// always ends the session instead of leaving an empty dashboard, and every
// failed call is logged.
const startedAt = new WeakMap<object, number>()

function describeRequest(request: unknown, options: { method?: string, params?: Record<string, unknown>, query?: Record<string, unknown> }) {
  const start = startedAt.get(options)
  return {
    url: typeof request === 'string' ? request : (request as { url?: string })?.url,
    method: options.method ?? 'GET',
    params: options.params ?? options.query,
    duration_ms: start === undefined ? undefined : Math.round(performance.now() - start)
  }
}

export const api = $fetch.create({
  onRequest({ options }) {
    startedAt.set(options, performance.now())
  },
  onRequestError({ request, options, error }) {
    useTelemetry().warn('api.network_error', { ...describeRequest(request, options), error_message: error?.message })
  },
  onResponseError({ request, options, response }) {
    const statusMessage = (response._data as { statusMessage?: string } | undefined)?.statusMessage
    const context = { ...describeRequest(request, options), status: response.status, status_message: statusMessage }
    if (response.status >= 500) useTelemetry().error('api.request_failed', context)
    else useTelemetry().warn('api.request_failed', context)

    if (response.status === 401) {
      $fetch('/api/auth/logout').finally(() => {
        navigateTo('/', { external: true })
      })
    }
  }
})
