import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

/**
 * `events.sponsors` (svef/www#130): an array of { name, logo, url, label }, where
 * `label` is localized. Two new tables and nothing else.
 *
 * **Trimmed by hand.** `payload migrate:create` diffs against the snapshot
 * (`*.json`), which does not contain the two submission tables — they came in by
 * the hand-written `20261008_000000_submissions` migration — so the generated
 * file also tried to create `feedback` and `talk_proposals` again. Only the
 * sponsors statements are kept. The snapshot saved beside this file is the full
 * current schema, so the next `migrate:create` starts clean.
 *
 * `IF NOT EXISTS` and guarded constraints, like the submissions migration, so it
 * is safe against a database that already got these tables by push.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "events_sponsors" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "logo_id" integer NOT NULL,
      "url" varchar
    );

    CREATE TABLE IF NOT EXISTS "events_sponsors_locales" (
      "label" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "events_sponsors" ADD CONSTRAINT "events_sponsors_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "events_sponsors" ADD CONSTRAINT "events_sponsors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "events_sponsors_locales" ADD CONSTRAINT "events_sponsors_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events_sponsors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "events_sponsors_order_idx" ON "events_sponsors" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "events_sponsors_parent_id_idx" ON "events_sponsors" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "events_sponsors_logo_idx" ON "events_sponsors" USING btree ("logo_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "events_sponsors_locales_locale_parent_id_unique" ON "events_sponsors_locales" USING btree ("_locale","_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(`
    DROP TABLE IF EXISTS "events_sponsors_locales" CASCADE;
    DROP TABLE IF EXISTS "events_sponsors" CASCADE;
  `)
}
