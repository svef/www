CREATE TABLE "user_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"type" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_event_type_check" CHECK (length("user_event"."type") > 0)
);
--> statement-breakpoint
ALTER TABLE "user_role" DROP CONSTRAINT "user_role_role_check";--> statement-breakpoint
ALTER TABLE "user_event" ADD CONSTRAINT "user_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event" ADD CONSTRAINT "user_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_event_user_idx" ON "user_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_event_created_idx" ON "user_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "entry_event_created_idx" ON "entry_event" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_check" CHECK ("user_role"."role" in ('admin', 'staff'));--> statement-breakpoint
-- The role that opens the admin is called `admin` now (it was `staff`). Rename the rows in
-- place; the CHECK above accepts both, so nothing is dropped. A user who somehow already
-- holds an active `admin` keeps that row and their `staff` row is left as it is.
UPDATE "user_role" SET "role" = 'admin', "updated_at" = now()
	WHERE "role" = 'staff'
	AND NOT EXISTS (
		SELECT 1 FROM "user_role" AS "held"
		WHERE "held"."user_id" = "user_role"."user_id"
			AND "held"."role" = 'admin'
			AND "held"."deleted_at" IS NULL
	);--> statement-breakpoint
-- user_event is an append-only log, like entry_event (0001).
CREATE FUNCTION "user_event_reject_change"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'user_event is append-only: % is not allowed', TG_OP
		USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "user_event_no_update_delete"
	BEFORE UPDATE OR DELETE ON "user_event"
	FOR EACH ROW EXECUTE FUNCTION "user_event_reject_change"();--> statement-breakpoint
CREATE TRIGGER "user_event_no_truncate"
	BEFORE TRUNCATE ON "user_event"
	FOR EACH STATEMENT EXECUTE FUNCTION "user_event_reject_change"();
