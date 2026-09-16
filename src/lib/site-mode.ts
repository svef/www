// What the site renders — a compile-time switch, not an env var, so behaviour is
// pinned per branch:
//   main → LANDING_ONLY = true  → the temporary landing one-pager only
//   dev  → LANDING_ONLY = false → the full website under construction
// `dev` is exactly `main` plus the one-line flip below.
export const LANDING_ONLY = false
