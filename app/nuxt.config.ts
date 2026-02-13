// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  colorMode: {
    preference: 'dark'
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

  runtimeConfig: {
    // Private keys (only available on server-side)
    apsClientId: process.env.APS_CLIENT_ID,
    apsClientSecret: process.env.APS_CLIENT_SECRET,
    apsRedirectUri: process.env.APS_REDIRECT_URI || 'http://localhost:3000/api/auth/aps/callback',
    // Public keys (exposed to client-side)
    public: {
      posthogPrivateKey: process.env.POSTHOG_KEY,
      posthogHost: process.env.POSTHOG_HOST
    }
  }
})
