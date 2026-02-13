export default defineNuxtPlugin(() => {
  const originalFetch = $fetch

  globalThis.$fetch = originalFetch.create({
    onResponseError({ response }) {
      if (response.status === 401) {
        originalFetch('/api/auth/logout').finally(() => {
          navigateTo('/', { external: true })
        })
      }
    }
  })
})
