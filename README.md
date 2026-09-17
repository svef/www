# svef.is

Website for **SVEF — Samtök vefiðnaðarins** (the Icelandic Web Industry Association).
Public brand site + self-hosted CMS. Bilingual (Icelandic-first, English).

> Repo history note: `main` is a fresh start (Aug 2026). The previous multi-site
> `www` scaffold (2017–2018) is preserved on the **`archive`** branch.

## Stack

- **Next.js 16** (App Router) + **React 19**, TypeScript strict
- **Payload CMS 3** embedded (admin at `/admin`, API at `/api`)
- **Neon Postgres** via `@payloadcms/db-postgres`
- **Cloudflare R2** media storage via `@payloadcms/storage-s3`
- **Mantine v8 + CSS Modules (SCSS)** — no Tailwind
- **Vitest + Testing Library + Playwright + axe** (a11y-first)
- Hosting: **Vercel**

## Getting started

```bash
npm install                  # also generates src/payload-types.ts (postinstall)
cp .env.example .env.local   # fill in Neon + R2 + PAYLOAD_SECRET
                             # (local-only setup: see "Development fixtures")
npm run dev                  # site + Payload admin at /admin
```

`src/payload-types.ts` is generated and gitignored, and the app imports it, so
`npm install` writes it via `postinstall` — that is what keeps a fresh checkout,
CI and a deploy able to typecheck. Re-run `npm run generate:types` after
changing a collection or a global.

## Scripts

| Script | What |
|---|---|
| `dev` / `build` / `start` | Next.js |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:ci` | Vitest (watch / run + coverage) |
| `e2e` / `e2e:a11y` | Playwright (+ axe sweeps) |
| `generate:types` / `generate:importmap` | Payload codegen |
| `seed:dev` | Fill a **local** database with development fixtures (see below) |

## Development fixtures

Every content table starts empty, so nothing that reads from Payload can be looked
at until something is in the database. `npm run seed:dev` fills a local database
through Payload's Local API.

**1. Start a local Postgres.** Any Postgres 17 on your machine works; the quickest
is a container:

```bash
docker run -d --name svef-postgres -p 5433:5432 \
  -e POSTGRES_USER=svef -e POSTGRES_PASSWORD=svef -e POSTGRES_DB=svef \
  postgres:17-alpine
```

(If you already have something on 5432, keep the `5433:5432` mapping below.)

**2. Point `.env.local` at it.** `.env.example` ships these empty because the
deployed environments use Neon; for local work set both to the same URL:

```bash
DATABASE_URL=postgresql://svef:svef@localhost:5433/svef
DATABASE_URL_UNPOOLED=postgresql://svef:svef@localhost:5433/svef
PAYLOAD_SECRET=$(openssl rand -hex 32)
```

R2 variables can stay empty — the fixtures create no uploads.

**3. Seed.**

```bash
npm run seed:dev
```

There is no separate migration step: the Postgres adapter pushes the schema from
the collection definitions on first connect, so an empty database is created and
filled in one run. If `DATABASE_URL` is unset the script stops with
`DATABASE_URL is not set — nothing to seed.`

It is idempotent — re-running updates the same rows rather than adding new ones —
and it refuses to run against any host that is not local (`localhost`, `127.0.0.1`,
`::1`, `db`, `postgres`, `db.localtest.me`); anything else is rejected before a
single write. The copy lives in
`src/scripts/seed-data.ts` and is transcribed from the Claude Design export that is
the design of record, so what renders locally matches the design rather than
invented placeholder text.

These are **fixtures, not content.** Real content entry is a separate piece of work.
Uploads are skipped entirely (R2 is not provisioned), and English is seeded only
where the export actually has English, so the `is` → `en` fallback is exercised.

## End-to-end tests

`npm run e2e` runs the Playwright suite in `e2e/`: a smoke pass over every public
route in both locales (200, one `<h1>`, a content body, no console errors), a
heading-outline check, locale-routing assertions, a nav label → href contract,
internal-link integrity, the news article route, keyboard operability (skip link,
gallery lightbox), a check that the route table matches the filesystem, and
`e2e/a11y/` — axe sweeps against `wcag2a` / `wcag2aa` / `wcag21a` / `wcag21aa`,
including the gallery lightbox in its **open** state. `npm run e2e:a11y` runs only
the sweeps.

It needs the same **seeded local database** as `npm run dev` (see above).
Playwright builds the app and serves it on port `3100` itself — override with
`PLAYWRIGHT_PORT`, or set `PLAYWRIGHT_TEST_BASE_URL` to test an already-running app
(a preview deployment, say) and the build/start is skipped entirely.

```bash
npx playwright install chromium   # once
npm run e2e
```

A local run always builds the current tree. To point it at a server you started
yourself on the same port, set `PLAYWRIGHT_REUSE_SERVER=1` — without it, a stale
server is not silently reused, because a green run against someone else's build
proves nothing about your change.

### What these tests do NOT cover

The suite is a **route-level regression net**, and it is worth being plain about the
ceiling so it is not trusted further than it deserves:

- **No copy is asserted.** A page must render its expected `<h1>` and at least one
  `<section>` or `<article>` — enough to catch a gutted page — but nothing checks
  what it says. Replace every paragraph with lorem ipsum and the suite stays green.
- **No layout or visual checks.** No snapshots, no visual regression.
- **Link targets are checked for existence, not correctness.** A link is verified to
  resolve to a route the site has; that it is the *right* route is only pinned where
  `locale-routing.spec.ts` or `links.spec.ts` says so explicitly.
- **Chromium only, desktop only.** No Firefox, WebKit or mobile viewport.
- **No form submission**, and no authenticated or `/admin` surface.
- **Only one article is visited.** `article.spec.ts` takes the first card on the
  news index; it does not sweep every article, and it does not cover the
  `EmptyState` (the fixtures always have news) or the `publishedAt <= now` filter.

That is a deliberate scope. Per-page content assertions belong with the PR that
builds the page.

### Adding a route

A new page under `src/app/(app)/[locale]/` belongs in the `PAGES` table in
`e2e/pages.ts`, and `routes.spec.ts` fails if you forget — it walks the app
directory in both directions, so it also catches a `PAGES` entry whose page has
been deleted.

A route with a **dynamic segment** cannot be a fixed path, so it is declared in
`DYNAMIC_ROUTES` instead and covered by a spec of its own that resolves a real
value at runtime (`article.spec.ts` does this for `/frettir/[slug]`, taking the
first card on the news index rather than hard-coding a fixture slug). Declaring it
is not optional either: an undeclared dynamic shape is treated as a dead link.

### Tracked exceptions

Three allowlists, all the same shape and all carrying the same bargain — an entry
names the issue that will remove it, and a guard test asserts the problem **still
reproduces**, so fixing the issue turns the suite red until the entry is deleted.
An exclusion cannot quietly outlive its reason.

| File | Holds |
|---|---|
| `e2e/a11y/known-issues.ts` | Accepted axe violations, scoped to one rule, the specific elements that produce them, and an exact node count per URL (`#34`) |
| `e2e/known-links.ts` | Links that are knowingly dead — placeholders for pages not yet built (`#19`, `#20`, `#26`, `#23`) |
| `e2e/known-console-errors.ts` | Accepted console errors — currently empty |

Anything outside these fails the run. The mechanism works: entries for `#59` (the
lightbox close button), `#24` (news card self-links) and `#60` (the RSC prefetch
404 on English pages) were deleted when those issues landed, because their guard
tests went red and said so.

### CI

`.github/workflows/ci.yml` runs the suite as a second job on every pull request.
**It is not a required check**: `dev` has no branch protection rule and the repo has
no rulesets, so a red run does not block a merge. Making it required is a repository
settings change that has not been done.

## Localization

Icelandic is served at the root (`/`); English lives under `/en`. Routing is handled
in [`src/proxy.ts`](src/proxy.ts) (Next 16 Proxy) rewriting to an internal `[locale]`
segment. Payload content uses field-level localization (IS default, EN fallback).
Winner archives, press, and bylaws are Icelandic-only (see planning docs).

## Structure

```
src/
  app/(app)/[locale]/   # public site (is | en)
  app/(payload)/        # Payload admin + API
  payload/              # collections, globals, config
  lib/                  # payload client, i18n, bylaws, theme
  styles/               # global SCSS + design tokens
```

## Not yet wired (next steps)

- **Design system** — translate the exported design into `src/styles/tokens.scss` +
  the Mantine theme, then build real components (current chrome is placeholder).
- **Storybook** — planned (`@storybook/nextjs-vite` + a11y addon); init pending.

## Bylaws

The bylaws (Lög SVEF) on `/um-svef` are fetched at build time from the README of the
public [`svef/Laws`](https://github.com/svef/Laws) repository, which is the association's
single source of truth for them. This repo deliberately keeps no second copy. A GitHub
Action on `svef/Laws` pings a Vercel Deploy Hook, so editing the bylaws rebuilds the site.

- **The source URL is not configurable.** It is pinned to the `HEAD` ref of `svef/Laws` in
  `src/lib/bylaws.ts`. `HEAD` follows whatever that repo's default branch is (it is
  `master`), so it is self-correcting. Do not add an environment override: a stale value in
  a hosting dashboard is exactly how this page silently broke.
- **A failed fetch fails the build, on purpose.** A page that quietly renders without the
  association's governing document is worse than a build that fails.
- **Transient failures are retried** (3 attempts, 500 ms linear backoff), because
  `raw.githubusercontent.com` is unauthenticated and rate-limits by IP, and Vercel build IPs
  are shared. A 404/410 is not retried — it means the source moved, and should fail fast.
- **`BYLAWS_ALLOW_DEGRADED=1` is the escape hatch**, off by default. During a GitHub
  incident, set it to unblock an unrelated deploy: the build warns instead of failing, and
  the page renders a visible notice linking to `svef/Laws` in place of the text. Unset it as
  soon as the incident is over.

Planning docs live outside this repo in the personal working tree (`.local/svef/`).
