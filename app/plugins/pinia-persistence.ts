import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin(({ $pinia }) => {
  ($pinia as any).use(piniaPluginPersistedstate)
})
