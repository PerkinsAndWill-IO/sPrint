import posthog from 'posthog-js'

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const posthogClient = posthog.init(runtimeConfig.public.posthogPublicKey as string, {
    api_host: runtimeConfig.public.posthogHost as string,
    capture_pageview: false,
    loaded: (posthog) => {
      if (import.meta.env.MODE === 'development') posthog.debug()
    }
  })

  const router = useRouter()
  router.afterEach((to) => {
    nextTick(() => {
      posthog.capture('$pageview', { path: to.fullPath })
    })
  })

  return {
    provide: {
      posthog: () => posthogClient
    }
  }
})
