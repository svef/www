import 'server-only'
import { cookies } from 'next/headers'

/**
 * The one place the awards code asks "who is this?" and "what time is it?".
 *
 * `getCurrentUserId()` is a stand-in for the accounts work (#158): integration
 * swaps its body for `requireUser()` and nothing else changes, because every
 * service function takes the acting `userId` as a parameter.
 *
 * Until then it has two modes:
 *  - **Test mode** (`AWARDS_TEST_SESSION=1`, and never on Vercel): the acting
 *    user is the id in the `awards-test-user` cookie, so an e2e can act as
 *    several users. `awards-test-clock-ms` shifts the server clock for that
 *    request (lock expiry without waiting twenty minutes).
 *  - Anything else throws "not wired". There is deliberately no way to reach
 *    the test path in production: it needs the env var, and the Vercel guard
 *    holds even if the variable were set there by mistake.
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

export async function getCurrentUserId(): Promise<string> {
  if (!testSessionEnabled())
    throw new Error('Awards sessions are not wired: replace getCurrentUserId() with requireUser() (#158).')
  const id = (await cookies()).get(TEST_USER_COOKIE)?.value
  if (!id) throw new NotSignedInError()
  return id
}

/** The server clock, shifted by the test cookie in test mode. Everything time-based reads this. */
export async function getRequestNow(): Promise<Date> {
  if (!testSessionEnabled()) return new Date()
  const offset = Number((await cookies()).get(TEST_CLOCK_COOKIE)?.value ?? 0)
  return new Date(Date.now() + (Number.isFinite(offset) ? offset : 0))
}
