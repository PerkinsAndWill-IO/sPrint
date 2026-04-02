import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve('./app')
    }
  },
  test: {
    environment: 'happy-dom'
  }
})
