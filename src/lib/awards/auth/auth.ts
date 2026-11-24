import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { uuidv7 } from 'uuidv7'
import { getAwardsDb } from '@/lib/awards/db/client'
import { account, rateLimit, session, user, verification } from '@/lib/awards/db/auth-tables'
import { passwordResetEmail, sendEmail, verificationEmail } from '@/lib/awards/email'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n'
import { AUTH_BASE_PATH } from './paths'

function localeOf(value: unknown): Locale {
  return typeof value === 'string' && isLocale(value) ? value : DEFAULT_LOCALE
}

function createAuth() {
  return betterAuth({
    basePath: AUTH_BASE_PATH,
    // Read from BETTER_AUTH_SECRET by default; stated so a missing one is loud.
    secret: process.env.BETTER_AUTH_SECRET,
    // Optional. Left unset, the base URL is taken from each request, which is
    // what previews and the e2e server (own port) need.
    baseURL: process.env.BETTER_AUTH_URL || undefined,
    database: drizzleAdapter(getAwardsDb(), {
      provider: 'pg',
      schema: { user, session, account, verification, rateLimit },
    }),
    advanced: {
      // Always Secure in production; localhost is exempt in browsers, so the
      // e2e server (a production build on http://localhost) still works.
      useSecureCookies: process.env.NODE_ENV === 'production',
      // UUIDv7 primary keys, generated in the app.
      database: { generateId: () => uuidv7() },
    },
    rateLimit: {
      // On by default only in production. `AWARDS_AUTH_RATE_LIMIT=off` is for
      // the e2e server, whose tests share one IP and sign in many times.
      enabled: process.env.AWARDS_AUTH_RATE_LIMIT !== 'off' && process.env.NODE_ENV === 'production',
      // Serverless instances do not share memory.
      storage: 'database',
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 3600, max: 10 },
        '/request-password-reset': { window: 3600, max: 5 },
        '/reset-password': { window: 3600, max: 10 },
        '/send-verification-email': { window: 3600, max: 5 },
      },
    },
    user: {
      additionalFields: {
        phone: { type: 'string', required: false, input: true },
        preferredLocale: { type: 'string', required: false, input: true },
      },
    },
    emailAndPassword: {
      enabled: true,
      // Verification gates *submitting*, not signing in or drafting,
      // so sign-in is never blocked on it; `emailVerified` is on the user.
      requireEmailVerification: false,
      minPasswordLength: 10,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: u, url }) => {
        const locale = localeOf((u as { preferredLocale?: unknown }).preferredLocale)
        await sendEmail({ to: u.email, ...passwordResetEmail({ locale, name: u.name, url }) })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user: u, url }) => {
        const locale = localeOf((u as { preferredLocale?: unknown }).preferredLocale)
        await sendEmail({ to: u.email, ...verificationEmail({ locale, name: u.name, url }) })
      },
    },
  })
}

type Auth = ReturnType<typeof createAuth>

let instance: Auth | undefined

/**
 * The Better Auth instance, created on first use so that importing a route
 * module (as `next build` does) needs neither the database nor the secret.
 */
export function getAuth(): Auth {
  instance ??= createAuth()
  return instance
}
