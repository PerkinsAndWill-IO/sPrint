// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: process.env.NODE_ENV !== 'production'
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light'
  },

  runtimeConfig: {
    // Private keys (only available on server-side)
    apsClientId: process.env.APS_CLIENT_ID,
    apsClientSecret: process.env.APS_CLIENT_SECRET,
    apsRedirectUri: process.env.APS_REDIRECT_URI || 'http://localhost:3000/api/auth/aps/callback',
    // Public keys (exposed to client-side)
    public: {
      apsClientId: process.env.APS_CLIENT_ID,
      // PostHog project key (public, write-only), used by both the browser and
      // the server. Unset = console logging only. Override at runtime with
      // NUXT_PUBLIC_POSTHOG_KEY / NUXT_PUBLIC_POSTHOG_HOST.
      posthogKey: process.env.POSTHOG_KEY || '',
      posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      // Tags every log line and event (Vercel system env vars)
      appRelease: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      appEnv: process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development')
    }
  },

  routeRules: {
    '/api/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    }
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    customCollections: [{
      prefix: 'sprint',
      dir: './app/assets/icons'
    }]
  }
})
