import 'server-only'
import { cookies } from 'next/headers'
import { getUser } from '@/lib/awards/auth/session'

/**
 * The one place the awards code asks "who is this?" and "what time is it?".
 *
 * The acting user comes from the Better Auth session (#158); every service function
 * takes that `userId` as a parameter.
 *
 * **Test mode** (`AWARDS_TEST_SESSION=1`, and never on Vercel) adds two overrides for
 * e2e: the `awards-test-user` cookie picks the acting user, and `awards-test-clock-ms`
 * shifts the server clock for that request (lock expiry without waiting twenty
 * minutes). There is deliberately no way to reach them in production: they need the
 * env var, and the Vercel guard holds even if it were set there by mistake.
 */

export const TEST_USER_COOKIE = 'awards-test-user'
export const TEST_CLOCK_COOKIE = 'awards-test-clock-ms'

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.')
    this.name = 'NotSignedInError'
  }
}

export function testSessionEnabled(): boolean {
  return process.env.AWARDS_TEST_SESSION === '1' && !process.env.VERCEL
}

/**
 * The signed-in user's id (#158), or `NotSignedInError`. In test mode an
 * `awards-test-user` cookie overrides it, so an e2e can act as several users
 * without signing each one in.
 */
export async function getCurrentUserId(): Promise<string> {
  if (testSessionEnabled()) {
    const id = (await cookies()).get(TEST_USER_COOKIE)?.value
    if (id) return id
  }
  const user = await getUser()
  if (!user) throw new NotSignedInError()
  return user.id
}

/** The server clock, shifted by the test cookie in test mode. Everything time-based reads this. */
export async function getRequestNow(): Promise<Date> {
  if (!testSessionEnabled()) return new Date()
  const offset = Number((await cookies()).get(TEST_CLOCK_COOKIE)?.value ?? 0)
  return new Date(Date.now() + (Number.isFinite(offset) ? offset : 0))
}
