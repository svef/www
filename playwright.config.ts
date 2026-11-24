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
          // Account flows read their emails from the local outbox, and their tests share
          // one IP, which Better Auth's production rate limiter would otherwise throttle.
          // `AWARDS_TEST_SESSION` lets an e2e act as several users through a cookie, on top
          // of real sign-in; it is honoured only off Vercel (src/lib/awards/session.ts).
          // The credential key is a throwaway so a production build can encrypt login details.
          // The staff area reads `AWARDS_CLOCK_NOW` instead of the real time, so its
          // after-close flows can run: 1 March 2027 is past the 2026 edition's close.
          env: {
            AWARDS_EMAIL_OUTBOX: '1',
            AWARDS_AUTH_RATE_LIMIT: 'off',
            AWARDS_TEST_SESSION: '1',
            AWARDS_CREDENTIAL_KEY: Buffer.alloc(32, 7).toString('base64'),
            AWARDS_CLOCK_NOW: '2027-03-01T00:00:00Z',
            CRON_SECRET: 'e2e-cron-secret',
          },
        },
      }
    : {}),
})
