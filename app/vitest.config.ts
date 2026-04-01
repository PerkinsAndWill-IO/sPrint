import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      'vue': resolve('./node_modules/vue'),
      '~': resolve('./app')
    }
  },
  test: {
    environment: 'happy-dom'
  }
})
