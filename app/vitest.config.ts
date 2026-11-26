import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve('./app'),
      '#shared': resolve('./shared')
    }
  },
  test: {
    environment: 'happy-dom'
  }
})
