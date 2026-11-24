import { defineConfig } from 'vitest/config'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

// Vitest exposes only VITE_* from .env files. The awards database smoke test
// reads AWARDS_DATABASE_URL*, so lift just those from .env.local (the real
// environment wins, as in CI). Payload's DATABASE_URL stays out of tests.
const localEnv = existsSync('.env.local')
  ? parseEnv(readFileSync('.env.local', 'utf8'))
  : {}
const awardsEnv = Object.fromEntries(
  Object.entries(localEnv).filter(
    (entry): entry is [string, string] =>
      entry[0].startsWith('AWARDS_') &&
      entry[1] !== undefined &&
      !(entry[0] in process.env),
  ),
)

export default defineConfig({
  test: {
    env: awardsEnv,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: {
    alias: {
      // Payload's own alias for the config, which `@/lib/payload` imports. It is
      // set up by the Next plugin, so without it here anything that reaches the
      // reading layer fails to resolve under Vitest.
      '@payload-config': fileURLToPath(
        new URL('./src/payload.config.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
