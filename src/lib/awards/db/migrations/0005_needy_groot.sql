CREATE TABLE "project_invitation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"locale" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_invitation_token_hash_key" UNIQUE("token_hash"),
	CONSTRAINT "project_invitation_locale_check" CHECK ("project_invitation"."locale" in ('is', 'en'))
);
--> statement-breakpoint
ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_person_id_project_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."project_person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitation" ADD CONSTRAINT "project_invitation_used_by_user_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_invitation_person_idx" ON "project_invitation" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "project_invitation_project_idx" ON "project_invitation" USING btree ("project_id");