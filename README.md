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
npm install
cp .env.example .env.local   # fill in Neon + R2 + PAYLOAD_SECRET
                             # (local-only setup: see "Development fixtures")
npm run generate:types       # regenerate Payload types (gitignored)
npm run dev                  # site + Payload admin at /admin
```

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
- **CI** — GitHub Actions (typecheck · lint · test · build · e2e).
- **Bylaws** — build-time fetch from `svef/Laws` + deploy-hook rebuild.

Planning docs live outside this repo in the personal working tree (`.local/svef/`).
