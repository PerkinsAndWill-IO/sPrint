import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import type { Pinia } from 'pinia'

export default defineNuxtPlugin(({ $pinia }) => {
  ($pinia as Pinia).use(piniaPluginPersistedstate)
})
