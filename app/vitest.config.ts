import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      'vue': resolve('./node_modules/.pnpm/vue@3.5.27_typescript@5.9.3/node_modules/vue'),
      '~': resolve('./app')
    }
  },
  test: {
    environment: 'happy-dom'
  }
})
