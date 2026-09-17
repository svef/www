# CLAUDE.md — svef.is

Conventions for this repository, for both people and coding agents.

## What this is

The website for **SVEF — Samtök vefiðnaðarins**, the Icelandic Web Industry Association.

SVEF exists to share knowledge and raise professional standards in Icelandic web work, and
runs the Icelandic Web Awards — including an award for accessibility. This codebase is the
association's own shop window, so it is held to the standards the association advocates:
accessible, fast, well tested, and readable by someone seeing it for the first time. When a
trade-off comes up, favour the choice that would hold up as an example.

## Stack

- **Next.js 16** (App Router) + **React 19**, TypeScript `strict`
- **Payload CMS 3**, embedded — admin at `/admin`, API at `/api`
- **Neon Postgres** via `@payloadcms/db-postgres`; **Cloudflare R2** media via `@payloadcms/storage-s3`
- **Mantine v8 + CSS Modules (SCSS)** — no Tailwind
- **Vitest** + Testing Library, **Playwright** + axe, **Storybook**
- **npm** only (never pnpm/yarn). Hosting: Vercel.

## Layout

```
src/
  app/(app)/[locale]/   # public site (is | en)
  app/(payload)/        # Payload admin + API (framework files)
  app/(landing)/        # temporary landing one-pager
  payload/              # collections, globals
  components/           # colocated .tsx + .module.scss + .stories.tsx
  lib/                  # payload client, i18n, theme, site-mode
  styles/               # tokens.scss + globals.scss
```

## Branches and what each renders

`src/lib/site-mode.ts` holds a compile-time `LANDING_ONLY` constant, so behaviour is pinned
per branch rather than by environment variable:

- **`main`** — `LANDING_ONLY = true` → the temporary landing one-pager. Vercel production → svef.is.
- **`dev`** — `LANDING_ONLY = false` → the full site under construction. **Default branch**; branch from here.

`dev` carries the full-site work and diverges from `main` as that work lands; `main` holds
only the landing. **Never rebase or reset `dev` to match `main`** — the two branches are not
meant to stay one commit apart, and forcing it discards merged work. Launch is a deliberate
cutover: `dev` merges into `main` and the constant flips.

## Routing and language

- Icelandic is served at the root (unprefixed); English lives under `/en`. Handled in
  `src/proxy.ts` (Next 16 Proxy — the rename of `middleware.ts`), which rewrites to an
  internal `[locale]` segment.
- Payload uses field-level localization: `is` default, `en` with fallback.
- Some content is Icelandic-only by decision: the awards winners archive, press, and the bylaws.
- **Interface copy is Icelandic. Code, comments, commits, issues and PRs are English.**

## Design system

Tokens live in `src/styles/tokens.scss` and are mirrored by the Mantine theme in
`src/lib/theme.ts`. Use tokens; don't hard-code values.

- Dark canvas `#09060C`, Shy White `#FCFBFE`, Electric Violet `#8917E1`, with red / pink /
  yellow accents for emphasis and large shapes — not body text.
- **The brand is sharp/blocky: no rounded corners.** The radius tokens are `0` deliberately.
- Type: Overpass (body) and Noto Sans (headings), loaded with `next/font`.
- The recurring violet block motif is the brand's signature device; use it to frame and
  punctuate, not as wallpaper.

### Working from a design

The design of record depends on the surface:

- **The full site** (pages and the design system) — Claude Design exports, kept as
  self-contained HTML alongside the maintainer's working notes. They carry the real markup,
  CSS values and assets, so work from the export itself.
- **The temporary landing page** — a Figma file. Extract it with Figma's design-to-code
  (`get_design_context`) to get the real geometry and exported assets; those assets are
  committed under `public/landing/`.

Whichever it is:

- **Never rebuild a design from a screenshot.** Screenshots lose the real shapes, spacing
  and assets, and the result will not match. Go to the export.
- **Check the result in a browser at desktop and mobile widths** and compare it against the
  design before calling it done.
- CSS Modules fail silently: a class that doesn't exist resolves to `undefined` and the
  element renders unstyled. Confirm styling visually rather than assuming.

## Accessibility

Treated as a requirement, not a pass at the end:

- Semantic HTML, full keyboard operability, visible focus states, a skip link.
- AA contrast on the dark canvas — verify accent colours rather than assuming.
- Honour `prefers-reduced-motion`; meaningful `alt` text on media.
- axe runs in Storybook and in the Playwright sweeps; keep both clean.

## Content and CMS

- Collections and globals live in `src/payload/`. Read content in Server Components through
  Payload's **Local API** (`payload.find()`), not over HTTP.
- `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` are **generated**
  (`npm run generate:types`, `npm run generate:importmap`). Regenerate them; never hand-edit.
- If a field the design needs doesn't exist in the content model, extend the model or open an
  issue — don't approximate it in the UI.

### Rendering: static plus ISR, not `force-dynamic`

Public pages are **prerendered and revalidated**, and CI builds against a real Postgres
service container so a page that reads Payload at build time works there too:

- `export const revalidate = 300` on any route that reads Payload. Five minutes — long
  enough that the page is a cached file in practice, short enough that an editor who hits
  publish sees the change while still looking. Revalidation is lazy, so an unread route
  costs nothing. Read "Five minutes" as a floor, not a deadline — see below.
- **Most public pages have no dynamic segment of their own.** Seven of the eight page
  pairs are this case: `/frettir`, `/vidburdir`, `/um-svef` and the rest. They need
  `revalidate` and nothing else — no `generateStaticParams`, because the only segment
  that varies is `[locale]` and the layout above already generates it.
- A route that *adds* a dynamic segment gets its own `generateStaticParams`. Next calls
  it **once per parent param set, passing those params in** (`{ params: { locale: 'is' } }`,
  then `{ locale: 'en' }`), and crosses what you return with them. So:
  - **Use the parent params when the segment varies by locale.** Some content is
    Icelandic-only by decision — the awards winners archive, press, the bylaws. Returning
    the same list for both locales prerenders an `/en/…` page for every item that has no
    English; return the params for `is` and an empty array for `en`.
  - **Ignore them when it doesn't.** News slugs are not localized, so `/frettir/[slug]`
    returns one list and lets Next do the crossing.
- **Pass `pagination: false` to the `payload.find()` behind `generateStaticParams`.**
  Payload's `find` defaults to `limit: 10`. Without it a collection of hundreds
  prerenders its first ten pages and serves the rest through `dynamicParams` — green
  build, `●` in the route table, every page working, nobody any the wiser. The dev
  fixtures are too small to reproduce it, so the rule has to catch it.
- Apply the same visibility filter the page applies (`publishedAt <= now` for news): a
  prerendered page is a file written at build time, so anything scheduled must be left
  out and left to `dynamicParams`.
- **Never `export const dynamic = 'force-dynamic'`.** It opts the route out of the
  full-route cache and disables `revalidate`, so every visit is a function invocation plus
  a database round-trip plus a Payload init. If a page seems to need it, say why rather
  than reaching for it.

#### `revalidate` is a staleness floor, in both directions

`publishedAt <= now` is evaluated when a page is *rendered*, not when it is *requested*,
and a `notFound()` is cached exactly like a 200 — the full-route cache stores the 404
response with the route's `revalidate`:

```
$ curl -sI localhost:3000/frettir/framtidar-frett-2027
HTTP/1.1 404 Not Found
x-nextjs-cache: HIT
Cache-Control: s-maxage=300, stale-while-revalidate=31535700
```

So the request that crosses a boundary **gets the stale answer** and only triggers the
regeneration; the request after it gets the fresh one. Crossing a date therefore costs
one revalidation window **plus one throwaway request**, and on a site with this little
traffic that second request can be a long time coming.

This cuts both ways, and the second direction is the one to worry about:

- **Publishing by date is late.** An article whose date passes keeps 404ing for the
  window, and the first request afterwards still gets the cached 404.
- **Unpublishing by date does not work.** An article moved back into the future — or
  otherwise pulled — **stays publicly readable, and stays listed on the index**, for the
  window plus a request. `publishedAt` is not an embargo and not a takedown.

On-demand revalidation from a Payload `afterChange` hook (svef/www#67) is what makes
either direction immediate. Until it lands, do not lean on `publishedAt` for anything
that has to happen at a particular moment.

## The local gate

Run before opening a PR:

```bash
npm run typecheck && npm run lint && npm run test:ci && npm run build
npm run e2e          # where the change touches rendered pages
```

**`npm run build` and `npm run e2e` both need a running, seeded local database**
(README, "Development fixtures"). The build is not exempt: public pages are prerendered,
and prerendering a page that reads Payload means connecting to Postgres at build time. A
stopped or unseeded database fails the build with a connection error from deep inside
Payload, which reads like a code problem and is not one — start the database and seed it.

`npm run e2e` builds the app and serves it itself. It covers every public route in both
locales; a new page belongs in the `PAGES` table in `e2e/pages.ts`, or in `DYNAMIC_ROUTES` with a
spec of its own if it has a dynamic segment — a test enumerates the filesystem and
fails if you forget.

It is a **route-level** net: it checks a page loads, is accessible, has a sound
heading outline and links only to real routes. It does **not** assert page copy
beyond the `<h1>` and the presence of a content body. Content assertions
belong with the PR that builds the page. See the README for the full list of what it
does not cover, and for the three tracked-exception allowlists.

CI runs the same checks. **CI is not a required check** — `dev` has no branch
protection and the repo has no rulesets, so a red run does not block a merge. Local
verification is the gate; that is not a figure of speech.

## Git and pull requests

- Branch from **`dev`**. One issue ↔ one PR, squash-merged.
- Commit messages and PR descriptions are plain and descriptive. **No AI attribution** in
  commits or PR text.
- PR descriptions say what a human should verify. For UI changes, **describe what you checked
  at desktop and mobile widths** — which routes, which widths, what you compared against, and
  what you found. Don't commit screenshots or push them to a side branch; the description is
  the record.
- **Search existing issues before filing** — follow-ups belong on the board, not in a comment.

## Working as an agent in this repo

- Work in a **git worktree per issue** (`_work/www-<issue>`), never in a shared checkout.
  **Never `git stash`** — the stash is shared.
- Move the issue on the project board as you go: starting → In progress, PR open → In review.
- **Never merge.** A person merges, and sets the issue Done.
- Run the full local gate before pushing.
- If you're blocked, stop and say precisely what and why. Don't improvise around it.
- Report what you actually did, including what didn't work.

## Planning

The plan of record is **GitHub issues** on this repo plus the
[SVEF web project board](https://github.com/orgs/svef/projects/2) — not documents.
Labels: `area:*`, `size:*`, `blocked`. Milestones: `v1 - full-site launch`, `v2 - member portal`.
Decisions are recorded as a comment on the issue they affect.
