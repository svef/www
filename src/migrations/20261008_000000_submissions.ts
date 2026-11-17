import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

/**
 * The two submission tables, and nothing else.
 *
 * **Hand-written on purpose.** `payload migrate:create` writes a migration by
 * diffing this branch's collections against the live database — and `main` and
 * `dev` share one Neon database whose schema has moved on with `dev` (localized
 * slugs, a different set of social fields). A generated migration would not add
 * two tables; it would try to *revert* those. This adds, and touches nothing it
 * did not create.
 *
 * **Ordering (#143).** Payload runs migrations in *filename* order (it reads the
 * directory and sorts; `index.ts` order is irrelevant to `payload migrate`), and
 * this file's `20261008_000000` timestamp sorts before `20261008_035238_initial`.
 * After each `up`, Payload inserts a row into `payload_migrations` — a table the
 * initial migration creates. On an empty database this migration therefore ran
 * first and the insert failed ("relation payload_migrations does not exist").
 * Production could not notice: it was already past both. The migration's name
 * is recorded in production's `payload_migrations`, so it cannot be renamed
 * without Payload treating it as new; instead it creates the bookkeeping table
 * itself (identical definition, `IF NOT EXISTS`), and the initial migration's
 * `payload_migrations` statements were made `IF NOT EXISTS` to match. Both edits
 * are no-ops wherever the migrations have already run.
 *
 * `IF NOT EXISTS` throughout so it is safe to run against a database that
 * already has them — including the local one, which gets its schema by push.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "payload_migrations" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar,
      "batch" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");

    DO $$ BEGIN
      CREATE TYPE "public"."enum_feedback_subject" AS ENUM('general', 'awards', 'event-oct-8', 'event-oct-21', 'other');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_talk_proposals_topics" AS ENUM('development', 'design', 'ux', 'accessibility', 'ai', 'project-management', 'content', 'marketing', 'security', 'infrastructure', 'data', 'other');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS "feedback" (
      "id" serial PRIMARY KEY NOT NULL,
      "subject" "enum_feedback_subject" NOT NULL,
      "subject_other" varchar,
      "message" varchar NOT NULL,
      "name" varchar,
      "email" varchar,
      "locale" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "talk_proposals" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "summary" varchar NOT NULL,
      "name" varchar NOT NULL,
      "email" varchar NOT NULL,
      "notes" varchar,
      "locale" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "talk_proposals_topics" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_talk_proposals_topics"
    );

    DO $$ BEGIN
      ALTER TABLE "talk_proposals_topics"
        ADD CONSTRAINT "talk_proposals_topics_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."talk_proposals"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback" ("created_at");
    CREATE INDEX IF NOT EXISTS "talk_proposals_created_at_idx" ON "talk_proposals" ("created_at");
    CREATE INDEX IF NOT EXISTS "talk_proposals_topics_parent_idx" ON "talk_proposals_topics" ("parent_id");
  `)
}

/**
 * Down drops what up created — and nothing else, for the same reason.
 *
 * Note that running this destroys submissions. It exists because a migration
 * without a down is a migration you cannot back out of, not because dropping
 * these is ever routine.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(`
    DROP TABLE IF EXISTS "talk_proposals_topics" CASCADE;
    DROP TABLE IF EXISTS "talk_proposals" CASCADE;
    DROP TABLE IF EXISTS "feedback" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_talk_proposals_topics";
    DROP TYPE IF EXISTS "public"."enum_feedback_subject";
  `)
}
