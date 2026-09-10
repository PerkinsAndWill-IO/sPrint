// Nuxt 4 auto-imports `$fetch` as a module binding captured at boot
// (`export const $fetch = globalThis.$fetch`), so reassigning
// `globalThis.$fetch` in a plugin never intercepts anything. Every client
// API call goes through this instance so a 401 (stale/revoked APS token)
// always ends the session instead of leaving an empty dashboard.
export const api = $fetch.create({
  onResponseError({ response }) {
    if (response.status === 401) {
      $fetch('/api/auth/logout').finally(() => {
        navigateTo('/', { external: true })
      })
    }
  }
})
