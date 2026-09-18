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
    preference: 'dark'
  },

  runtimeConfig: {
    // Private keys (only available on server-side)
    apsClientId: process.env.APS_CLIENT_ID,
    apsClientSecret: process.env.APS_CLIENT_SECRET,
    apsRedirectUri: process.env.APS_REDIRECT_URI || 'http://localhost:3000/api/auth/aps/callback',
    // Public keys (exposed to client-side)
    public: {
      apsClientId: process.env.APS_CLIENT_ID,
      posthogPublicKey: process.env.POSTHOG_KEY,
      posthogHost: process.env.POSTHOG_HOST
    }
  },

  routeRules: {
    '/api/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    },
    // The preview modal renders this endpoint inside a same-origin iframe so the
    // browser's PDF viewer can stream the file; DENY would block that.
    '/api/aps/derivative': {
      headers: {
        'X-Frame-Options': 'SAMEORIGIN'
      }
    }
  },

  compatibilityDate: '2024-07-11',

  hooks: {
    // Pin the SSR Vite server's HMR WebSocket port. When PORT=3000 is in the
    // environment (the desktop app's preview runner sets it), @nuxt/vite-builder
    // asks get-port-please for a port without naming one, get-port-please
    // defaults to process.env.PORT, finds 3000 free on IPv6, and Vite's HMR
    // socket binds [::]:3000. Chrome resolves localhost to ::1 first and every
    // page request then gets "426 Upgrade Required" from the WebSocket server.
    // This hook runs after the Nuxt CLI clears hmr.port, so the value sticks.
    'vite:extendConfig'(config, { isServer }) {
      if (isServer && config.server) {
        config.server.hmr = { ...(typeof config.server.hmr === 'object' ? config.server.hmr : {}), port: 24678 }
      }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
