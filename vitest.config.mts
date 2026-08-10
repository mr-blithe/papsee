import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Writing a synthetic card and reading it back costs seconds, and v8 coverage instrumentation
    // roughly doubles that, so the 5s default fails on CI for tests that are not actually broken.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    env: {
      TZ: 'Pacific/Kiritimati',
    },
    server: {
      deps: {
        inline: ['next-intl'],
      },
    },
  },
})
