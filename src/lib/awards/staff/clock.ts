/**
 * The clock the staff area reads: the server's, unless a test overrides it.
 *
 * "After close" cannot be tested against the real clock (the 2026 edition closes in
 * February 2027), and the e2e server is a production build, so a `NODE_ENV` guard would
 * switch the override off exactly where it is needed. `AWARDS_CLOCK_NOW` is therefore
 * honoured in any build except Vercel's production environment (`VERCEL_ENV`), and only by
 * the staff area (the eligibility actions, the export and the staff page): the public pages
 * and the entrant rules read the real time. It is set by `playwright.config.ts` and nowhere else.
 */
export function serverNow(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Date {
  const override = env.AWARDS_CLOCK_NOW
  if (override && env.VERCEL_ENV !== 'production') {
    const at = new Date(override)
    if (!Number.isNaN(at.getTime())) return at
  }
  return new Date()
}
