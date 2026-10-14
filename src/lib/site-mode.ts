// What the site renders — a compile-time switch, not an env var, so behaviour is
// pinned per branch:
//   main → LANDING_ONLY = true  → only the landing one-pager is served
//   dev  → LANDING_ONLY = false → the full website under construction
// `dev` is exactly `main` plus the one-line flip below, and keeping it that way
// is the point — anything else on `dev` means `main` has work `dev` has not seen.
//
// The switch is permanent, not launch scaffolding: it is also how the site can be
// put behind a single page temporarily, around the Awards for instance.
export const LANDING_ONLY = false
