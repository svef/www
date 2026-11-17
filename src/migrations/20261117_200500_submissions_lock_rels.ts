import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

/**
 * Completes the submission tables' schema to match the snapshot (#143): the
 * locked-document relation columns, and three indexes the hand-written
 * submissions migration left out.
 *
 * `20261008_000000_submissions` created `feedback` and `talk_proposals` but not
 * their columns on `payload_locked_documents_rels` — the table Payload's admin
 * uses to lock a document while someone edits it. Every migration snapshot
 * *since* has listed those columns, so `migrate:create` saw nothing missing and
 * never emitted SQL for them: a database built from migrations alone lacked two
 * columns that the code (and the snapshot) expect. Local databases did not
 * notice, because they get their schema by push.
 *
 * The missing indexes are `feedback_updated_at_idx`, `talk_proposals_updated_at_idx`
 * and `talk_proposals_topics_order_idx` (Payload adds an `updated_at` index on
 * every collection and an `order` index on every hasMany select).
 *
 * Purely additive and idempotent: new nullable columns on a bookkeeping table,
 * guarded constraints/indexes. It does not read, write or alter `feedback` or
 * `talk_proposals` rows (the FKs only reference their primary key).
 * The snapshot is unchanged — it already described these columns.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(`
    CREATE INDEX IF NOT EXISTS "feedback_updated_at_idx" ON "feedback" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "talk_proposals_updated_at_idx" ON "talk_proposals" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "talk_proposals_topics_order_idx" ON "talk_proposals_topics" USING btree ("order");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "feedback_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "talk_proposals_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_feedback_fk"
        FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_talk_proposals_fk"
        FOREIGN KEY ("talk_proposals_id") REFERENCES "public"."talk_proposals"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_feedback_id_idx" ON "payload_locked_documents_rels" USING btree ("feedback_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_talk_proposals_id_idx" ON "payload_locked_documents_rels" USING btree ("talk_proposals_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(`
    DROP INDEX IF EXISTS "feedback_updated_at_idx";
    DROP INDEX IF EXISTS "talk_proposals_updated_at_idx";
    DROP INDEX IF EXISTS "talk_proposals_topics_order_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_feedback_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_talk_proposals_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_feedback_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_talk_proposals_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "feedback_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "talk_proposals_id";
  `)
}
