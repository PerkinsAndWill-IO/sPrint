import { createTelemetry, planTelemetry, type TelemetryAdapter } from '#shared/telemetry/telemetry'
import { createConsoleAdapter } from '#shared/telemetry/console-adapter'
import { createPostHogBrowserAdapter } from '~/telemetry/posthog-adapter'

export default defineNuxtPlugin({
  name: 'telemetry',
  enforce: 'pre',
  setup(nuxtApp) {
    const config = useRuntimeConfig().public
    const key = config.posthogKey?.trim()
    const plan = planTelemetry({ key, dev: import.meta.dev, side: 'client' })

    const adapters: TelemetryAdapter[] = []
    if (plan.consoleLevel) adapters.push(createConsoleAdapter({ minLevel: plan.consoleLevel, json: false }))
    if (plan.posthog && key) {
      adapters.push(createPostHogBrowserAdapter({ key, host: config.posthogHost, release: config.appRelease }))
    }

    const telemetry = createTelemetry(adapters, { side: 'client', release: config.appRelease, env: config.appEnv })
    setTelemetry(telemetry)

    // Uncaught window errors and unhandled rejections are captured by
    // posthog-js (capture_exceptions); errors Vue catches never reach window
    nuxtApp.hook('vue:error', (error, _instance, info) => {
      telemetry.captureException(error, { source: 'vue', vue_info: info })
    })
    nuxtApp.hook('app:error', (error) => {
      telemetry.captureException(error, { source: 'nuxt' })
    })

    return { provide: { telemetry } }
  }
})
