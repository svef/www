import { defineConfig, devices } from '@playwright/test'

// The app under test. Default to a port of its own so an e2e run never collides
// with a `next dev` someone already has on 3000.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100)
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? `http://localhost:${port}`

// Point PLAYWRIGHT_TEST_BASE_URL at an already-running app (a preview
// deployment, or a server you started yourself) to skip the build+start.
const managedServer = !process.env.PLAYWRIGHT_TEST_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries, deliberately. A retry turns a test that fails half the time into
  // one that passes CI about three quarters of the time, which hides exactly the
  // flakiness worth knowing about. 300 test executions while building this suite
  // produced zero flakes, so a retry budget buys nothing here. If something does
  // start flaking, that is a bug to fix rather than to re-roll.
  retries: 0,
  // `list` for the log, `html` so there is an actual report to upload from CI.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(managedServer
    ? {
        webServer: {
          command: `npm run build && npx next start --port ${port}`,
          url: baseURL,
          // Reusing whatever is already on the port is convenient while
          // iterating, but it silently tests *that* server rather than the
          // current tree — a green run that proves nothing about your change.
          // Opt in explicitly with PLAYWRIGHT_REUSE_SERVER=1.
          reuseExistingServer: !process.env.CI && !!process.env.PLAYWRIGHT_REUSE_SERVER,
          timeout: 300_000,
        },
      }
    : {}),
})
