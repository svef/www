CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text,
	"preferred_locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_preferred_locale_check" CHECK ("user"."preferred_locale" in ('is', 'en'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "billing_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"kennitala" text NOT NULL,
	"company_name" text NOT NULL,
	"invoice_email" text NOT NULL,
	"address" text NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "billing_profile_kennitala_check" CHECK ("billing_profile"."kennitala" ~ '^[0-9]{10}$')
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid NOT NULL,
	"group_id" uuid,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"blurb" jsonb,
	"description" jsonb,
	"tier_label" jsonb,
	"price" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "category_edition_slug_key" UNIQUE("edition_id","slug"),
	CONSTRAINT "category_id_edition_key" UNIQUE("id","edition_id"),
	CONSTRAINT "category_price_check" CHECK ("category"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "category_exclusion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"category_a_id" uuid NOT NULL,
	"category_b_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "category_exclusion_pair_key" UNIQUE("category_a_id","category_b_id"),
	CONSTRAINT "category_exclusion_order_check" CHECK ("category_exclusion"."category_a_id" < "category_exclusion"."category_b_id")
);
--> statement-breakpoint
CREATE TABLE "category_group" (
	"id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"blurb" jsonb,
	"description" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"select_one" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "category_group_edition_slug_key" UNIQUE("edition_id","slug"),
	CONSTRAINT "category_group_id_edition_key" UNIQUE("id","edition_id")
);
--> statement-breakpoint
CREATE TABLE "credential" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"value_encrypted" "bytea" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "edition" (
	"id" uuid PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"intake_opens_at" timestamp with time zone NOT NULL,
	"early_bird_ends_before" timestamp with time zone NOT NULL,
	"intake_closes_before" timestamp with time zone NOT NULL,
	"early_bird_discount_percent" integer NOT NULL,
	"early_bird_rounding" text DEFAULT 'nearest-900' NOT NULL,
	"terms_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "edition_year_key" UNIQUE("year"),
	CONSTRAINT "edition_discount_check" CHECK ("edition"."early_bird_discount_percent" between 0 and 100),
	CONSTRAINT "edition_rounding_check" CHECK ("edition"."early_bird_rounding" in ('nearest-900')),
	CONSTRAINT "edition_dates_check" CHECK ("edition"."intake_opens_at" <= "edition"."early_bird_ends_before" and "edition"."early_bird_ends_before" <= "edition"."intake_closes_before")
);
--> statement-breakpoint
CREATE TABLE "entry" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"status_before_clarification" text,
	"submitted_at" timestamp with time zone,
	"price_regular" integer,
	"discount_percent" integer,
	"price_amount" integer,
	"price_locked_at" timestamp with time zone,
	"kriton_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "entry_project_category_key" UNIQUE("project_id","category_id"),
	CONSTRAINT "entry_status_check" CHECK ("entry"."status" in ('draft', 'submitted', 'eligibility_pending', 'eligible', 'ineligible', 'needs_clarification', 'withdrawn')),
	CONSTRAINT "entry_status_before_check" CHECK ("entry"."status_before_clarification" is null or "entry"."status_before_clarification" in ('draft','submitted','eligibility_pending','eligible','ineligible','withdrawn')),
	CONSTRAINT "entry_discount_check" CHECK ("entry"."discount_percent" is null or "entry"."discount_percent" between 0 and 100),
	CONSTRAINT "entry_price_snapshot_check" CHECK (("entry"."price_locked_at" is null and "entry"."price_regular" is null and "entry"."discount_percent" is null and "entry"."price_amount" is null)
        or ("entry"."price_locked_at" is not null and "entry"."price_regular" is not null and "entry"."discount_percent" is not null and "entry"."price_amount" is not null)),
	CONSTRAINT "entry_price_amount_check" CHECK ("entry"."price_amount" is null or "entry"."price_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "entry_answer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "entry_answer_entry_field_key" UNIQUE("entry_id","field_key")
);
--> statement-breakpoint
CREATE TABLE "entry_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"entry_id" uuid,
	"actor_user_id" uuid,
	"type" text NOT NULL,
	"field_key" text,
	"before" jsonb,
	"after" jsonb,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_event_type_check" CHECK (length("entry_event"."type") > 0)
);
--> statement-breakpoint
CREATE TABLE "entry_file" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"r2_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "entry_file_r2_key_key" UNIQUE("r2_key"),
	CONSTRAINT "entry_file_status_check" CHECK ("entry_file"."status" in ('pending', 'available', 'rejected')),
	CONSTRAINT "entry_file_size_check" CHECK ("entry_file"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "entry_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"field_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "entry_request_reply" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"billing_profile_id" uuid,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "project_locale_check" CHECK ("project"."locale" in ('is', 'en'))
);
--> statement-breakpoint
CREATE TABLE "project_answer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "project_answer_project_field_key" UNIQUE("project_id","field_key")
);
--> statement-breakpoint
CREATE TABLE "project_edit_lock" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"holder_user_id" uuid NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_edit_lock_project_key" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "project_person" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text,
	"company" text,
	"role" text,
	"can_edit" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "project_person_kind_check" CHECK ("project_person"."kind" in ('owner', 'collaborator'))
);
--> statement-breakpoint
CREATE TABLE "terms_acceptance" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"terms_version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_role_role_check" CHECK ("user_role"."role" in ('staff'))
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_profile" ADD CONSTRAINT "billing_profile_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_edition_id_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."edition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_group_edition_fk" FOREIGN KEY ("group_id","edition_id") REFERENCES "public"."category_group"("id","edition_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_exclusion" ADD CONSTRAINT "category_exclusion_category_a_id_category_id_fk" FOREIGN KEY ("category_a_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_exclusion" ADD CONSTRAINT "category_exclusion_category_b_id_category_id_fk" FOREIGN KEY ("category_b_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_group" ADD CONSTRAINT "category_group_edition_id_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."edition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_answer" ADD CONSTRAINT "entry_answer_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_event" ADD CONSTRAINT "entry_event_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_event" ADD CONSTRAINT "entry_event_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_event" ADD CONSTRAINT "entry_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_file" ADD CONSTRAINT "entry_file_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_request" ADD CONSTRAINT "entry_request_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_request" ADD CONSTRAINT "entry_request_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_request" ADD CONSTRAINT "entry_request_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_request_reply" ADD CONSTRAINT "entry_request_reply_request_id_entry_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."entry_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_request_reply" ADD CONSTRAINT "entry_request_reply_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_edition_id_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."edition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_billing_profile_id_billing_profile_id_fk" FOREIGN KEY ("billing_profile_id") REFERENCES "public"."billing_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_answer" ADD CONSTRAINT "project_answer_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_edit_lock" ADD CONSTRAINT "project_edit_lock_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_edit_lock" ADD CONSTRAINT "project_edit_lock_holder_user_id_user_id_fk" FOREIGN KEY ("holder_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_person" ADD CONSTRAINT "project_person_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_person" ADD CONSTRAINT "project_person_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms_acceptance" ADD CONSTRAINT "terms_acceptance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms_acceptance" ADD CONSTRAINT "terms_acceptance_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "billing_profile_owner_idx" ON "billing_profile" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "category_group_idx" ON "category" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "category_exclusion_b_idx" ON "category_exclusion" USING btree ("category_b_id");--> statement-breakpoint
CREATE INDEX "credential_project_idx" ON "credential" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_kriton_entry_id_key" ON "entry" USING btree ("kriton_entry_id") WHERE "entry"."kriton_entry_id" is not null;--> statement-breakpoint
CREATE INDEX "entry_category_idx" ON "entry" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "entry_status_idx" ON "entry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "entry_event_project_idx" ON "entry_event" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "entry_event_entry_idx" ON "entry_event" USING btree ("entry_id","created_at");--> statement-breakpoint
CREATE INDEX "entry_file_project_field_idx" ON "entry_file" USING btree ("project_id","field_key");--> statement-breakpoint
CREATE INDEX "entry_request_entry_idx" ON "entry_request" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "entry_request_open_idx" ON "entry_request" USING btree ("deadline_at") WHERE "entry_request"."resolved_at" is null and "entry_request"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "entry_request_reply_request_idx" ON "entry_request_reply" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "project_edition_idx" ON "project" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX "project_created_by_idx" ON "project" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "project_billing_profile_idx" ON "project" USING btree ("billing_profile_id");--> statement-breakpoint
CREATE INDEX "project_person_project_idx" ON "project_person" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_person_user_idx" ON "project_person" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_person_project_user_key" ON "project_person" USING btree ("project_id","user_id") WHERE "project_person"."user_id" is not null and "project_person"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "terms_acceptance_project_idx" ON "terms_acceptance" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "terms_acceptance_user_idx" ON "terms_acceptance" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_user_role_key" ON "user_role" USING btree ("user_id","role") WHERE "user_role"."deleted_at" is null;