import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('is', 'en');
  CREATE TYPE "public"."enum_home_page_happening_now_mode" AS ENUM('nextEvent', 'winner', 'hidden');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_medium_url" varchar,
  	"sizes_medium_width" numeric,
  	"sizes_medium_height" numeric,
  	"sizes_medium_mime_type" varchar,
  	"sizes_medium_filesize" numeric,
  	"sizes_medium_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone,
  	"venue_address" varchar,
  	"ticket_url" varchar,
  	"ticket_price" numeric,
  	"member_price" numeric,
  	"cover_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_locales" (
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"location" varchar,
  	"description" jsonb,
  	"accessibility" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"published_at" timestamp(3) with time zone NOT NULL,
  	"author" varchar,
  	"cover_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "news_locales" (
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"excerpt" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "award_editions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"year" numeric NOT NULL,
  	"ceremony_date" timestamp(3) with time zone,
  	"venue" varchar,
  	"submission_deadline" timestamp(3) with time zone,
  	"submission_url" varchar,
  	"tickets_on_sale_from" timestamp(3) with time zone,
  	"ticket_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "award_editions_locales" (
  	"headline" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "award_winners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_name" varchar NOT NULL,
  	"edition_id" integer NOT NULL,
  	"category_id" integer NOT NULL,
  	"url" varchar,
  	"screenshot_id" integer,
  	"blurb" varchar,
  	"is_special" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "award_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "award_categories_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "board_members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"company" varchar,
  	"photo_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "board_members_locales" (
  	"role" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "galleries_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "galleries_images_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "galleries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"event_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "galleries_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"events_id" integer,
  	"news_id" integer,
  	"award_editions_id" integer,
  	"award_winners_id" integer,
  	"award_categories_id" integer,
  	"board_members_id" integer,
  	"galleries_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contact_email" varchar DEFAULT 'svef@svef.is',
  	"social_facebook" varchar,
  	"social_instagram" varchar,
  	"social_linkedin" varchar,
  	"social_messenger" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"tagline" varchar,
  	"footer_blurb" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"happening_now_mode" "enum_home_page_happening_now_mode" DEFAULT 'nextEvent',
  	"happening_now_winner_id" integer,
  	"show_upcoming_events" boolean DEFAULT true,
  	"show_recent_winners" boolean DEFAULT true,
  	"show_photos" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_locales" (
  	"hero_sentence" varchar,
  	"hero_hook" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "about_page_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "about_page_faq_locales" (
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "about_page_press" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"outlet" varchar NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "about_page_brand_assets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"file_id" integer NOT NULL
  );
  
  CREATE TABLE "about_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_page_locales" (
  	"story" jsonb,
  	"board_intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "membership_page_tiers_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "membership_page_tiers_benefits_locales" (
  	"benefit" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "membership_page_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"price_i_s_k" numeric NOT NULL,
  	"featured" boolean
  );
  
  CREATE TABLE "membership_page_tiers_locales" (
  	"name" varchar NOT NULL,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "membership_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"signup_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "membership_page_locales" (
  	"intro" varchar,
  	"signup_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "awards_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "awards_page_locales" (
  	"intro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_locales" ADD CONSTRAINT "events_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_locales" ADD CONSTRAINT "events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_locales" ADD CONSTRAINT "news_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_locales" ADD CONSTRAINT "news_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "award_editions_locales" ADD CONSTRAINT "award_editions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."award_editions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "award_winners" ADD CONSTRAINT "award_winners_edition_id_award_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."award_editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "award_winners" ADD CONSTRAINT "award_winners_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "award_winners" ADD CONSTRAINT "award_winners_screenshot_id_media_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "award_categories_locales" ADD CONSTRAINT "award_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "board_members" ADD CONSTRAINT "board_members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "board_members_locales" ADD CONSTRAINT "board_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."board_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "galleries_images" ADD CONSTRAINT "galleries_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galleries_images" ADD CONSTRAINT "galleries_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "galleries_images_locales" ADD CONSTRAINT "galleries_images_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."galleries_images"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "galleries" ADD CONSTRAINT "galleries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galleries_locales" ADD CONSTRAINT "galleries_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_award_editions_fk" FOREIGN KEY ("award_editions_id") REFERENCES "public"."award_editions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_award_winners_fk" FOREIGN KEY ("award_winners_id") REFERENCES "public"."award_winners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_award_categories_fk" FOREIGN KEY ("award_categories_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_board_members_fk" FOREIGN KEY ("board_members_id") REFERENCES "public"."board_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_galleries_fk" FOREIGN KEY ("galleries_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_happening_now_winner_id_award_winners_id_fk" FOREIGN KEY ("happening_now_winner_id") REFERENCES "public"."award_winners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_locales" ADD CONSTRAINT "home_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_faq" ADD CONSTRAINT "about_page_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_faq_locales" ADD CONSTRAINT "about_page_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_press" ADD CONSTRAINT "about_page_press_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_brand_assets" ADD CONSTRAINT "about_page_brand_assets_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_brand_assets" ADD CONSTRAINT "about_page_brand_assets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_locales" ADD CONSTRAINT "about_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "membership_page_tiers_benefits" ADD CONSTRAINT "membership_page_tiers_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."membership_page_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "membership_page_tiers_benefits_locales" ADD CONSTRAINT "membership_page_tiers_benefits_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."membership_page_tiers_benefits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "membership_page_tiers" ADD CONSTRAINT "membership_page_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."membership_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "membership_page_tiers_locales" ADD CONSTRAINT "membership_page_tiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."membership_page_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "membership_page_locales" ADD CONSTRAINT "membership_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."membership_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "awards_page_locales" ADD CONSTRAINT "awards_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."awards_page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_medium_sizes_medium_filename_idx" ON "media" USING btree ("sizes_medium_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_cover_image_idx" ON "events" USING btree ("cover_image_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events_slug_idx" ON "events_locales" USING btree ("slug","_locale");
  CREATE INDEX "events_meta_meta_image_idx" ON "events_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "events_locales_locale_parent_id_unique" ON "events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_media_id_idx" ON "events_rels" USING btree ("media_id");
  CREATE INDEX "news_cover_image_idx" ON "news" USING btree ("cover_image_id");
  CREATE INDEX "news_updated_at_idx" ON "news" USING btree ("updated_at");
  CREATE INDEX "news_created_at_idx" ON "news" USING btree ("created_at");
  CREATE INDEX "news_slug_idx" ON "news_locales" USING btree ("slug","_locale");
  CREATE INDEX "news_meta_meta_image_idx" ON "news_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "news_locales_locale_parent_id_unique" ON "news_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "award_editions_year_idx" ON "award_editions" USING btree ("year");
  CREATE INDEX "award_editions_updated_at_idx" ON "award_editions" USING btree ("updated_at");
  CREATE INDEX "award_editions_created_at_idx" ON "award_editions" USING btree ("created_at");
  CREATE UNIQUE INDEX "award_editions_locales_locale_parent_id_unique" ON "award_editions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "award_winners_edition_idx" ON "award_winners" USING btree ("edition_id");
  CREATE INDEX "award_winners_category_idx" ON "award_winners" USING btree ("category_id");
  CREATE INDEX "award_winners_screenshot_idx" ON "award_winners" USING btree ("screenshot_id");
  CREATE INDEX "award_winners_updated_at_idx" ON "award_winners" USING btree ("updated_at");
  CREATE INDEX "award_winners_created_at_idx" ON "award_winners" USING btree ("created_at");
  CREATE UNIQUE INDEX "award_categories_slug_idx" ON "award_categories" USING btree ("slug");
  CREATE INDEX "award_categories_updated_at_idx" ON "award_categories" USING btree ("updated_at");
  CREATE INDEX "award_categories_created_at_idx" ON "award_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "award_categories_locales_locale_parent_id_unique" ON "award_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "board_members_photo_idx" ON "board_members" USING btree ("photo_id");
  CREATE INDEX "board_members_updated_at_idx" ON "board_members" USING btree ("updated_at");
  CREATE INDEX "board_members_created_at_idx" ON "board_members" USING btree ("created_at");
  CREATE UNIQUE INDEX "board_members_locales_locale_parent_id_unique" ON "board_members_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "galleries_images_order_idx" ON "galleries_images" USING btree ("_order");
  CREATE INDEX "galleries_images_parent_id_idx" ON "galleries_images" USING btree ("_parent_id");
  CREATE INDEX "galleries_images_image_idx" ON "galleries_images" USING btree ("image_id");
  CREATE UNIQUE INDEX "galleries_images_locales_locale_parent_id_unique" ON "galleries_images_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "galleries_event_idx" ON "galleries" USING btree ("event_id");
  CREATE INDEX "galleries_updated_at_idx" ON "galleries" USING btree ("updated_at");
  CREATE INDEX "galleries_created_at_idx" ON "galleries" USING btree ("created_at");
  CREATE UNIQUE INDEX "galleries_locales_locale_parent_id_unique" ON "galleries_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_news_id_idx" ON "payload_locked_documents_rels" USING btree ("news_id");
  CREATE INDEX "payload_locked_documents_rels_award_editions_id_idx" ON "payload_locked_documents_rels" USING btree ("award_editions_id");
  CREATE INDEX "payload_locked_documents_rels_award_winners_id_idx" ON "payload_locked_documents_rels" USING btree ("award_winners_id");
  CREATE INDEX "payload_locked_documents_rels_award_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("award_categories_id");
  CREATE INDEX "payload_locked_documents_rels_board_members_id_idx" ON "payload_locked_documents_rels" USING btree ("board_members_id");
  CREATE INDEX "payload_locked_documents_rels_galleries_id_idx" ON "payload_locked_documents_rels" USING btree ("galleries_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home_page_happening_now_happening_now_winner_idx" ON "home_page" USING btree ("happening_now_winner_id");
  CREATE UNIQUE INDEX "home_page_locales_locale_parent_id_unique" ON "home_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_page_faq_order_idx" ON "about_page_faq" USING btree ("_order");
  CREATE INDEX "about_page_faq_parent_id_idx" ON "about_page_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "about_page_faq_locales_locale_parent_id_unique" ON "about_page_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_page_press_order_idx" ON "about_page_press" USING btree ("_order");
  CREATE INDEX "about_page_press_parent_id_idx" ON "about_page_press" USING btree ("_parent_id");
  CREATE INDEX "about_page_brand_assets_order_idx" ON "about_page_brand_assets" USING btree ("_order");
  CREATE INDEX "about_page_brand_assets_parent_id_idx" ON "about_page_brand_assets" USING btree ("_parent_id");
  CREATE INDEX "about_page_brand_assets_file_idx" ON "about_page_brand_assets" USING btree ("file_id");
  CREATE UNIQUE INDEX "about_page_locales_locale_parent_id_unique" ON "about_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "membership_page_tiers_benefits_order_idx" ON "membership_page_tiers_benefits" USING btree ("_order");
  CREATE INDEX "membership_page_tiers_benefits_parent_id_idx" ON "membership_page_tiers_benefits" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "membership_page_tiers_benefits_locales_locale_parent_id_uniq" ON "membership_page_tiers_benefits_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "membership_page_tiers_order_idx" ON "membership_page_tiers" USING btree ("_order");
  CREATE INDEX "membership_page_tiers_parent_id_idx" ON "membership_page_tiers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "membership_page_tiers_locales_locale_parent_id_unique" ON "membership_page_tiers_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "membership_page_locales_locale_parent_id_unique" ON "membership_page_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "awards_page_locales_locale_parent_id_unique" ON "awards_page_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_locales" CASCADE;
  DROP TABLE "events_rels" CASCADE;
  DROP TABLE "news" CASCADE;
  DROP TABLE "news_locales" CASCADE;
  DROP TABLE "award_editions" CASCADE;
  DROP TABLE "award_editions_locales" CASCADE;
  DROP TABLE "award_winners" CASCADE;
  DROP TABLE "award_categories" CASCADE;
  DROP TABLE "award_categories_locales" CASCADE;
  DROP TABLE "board_members" CASCADE;
  DROP TABLE "board_members_locales" CASCADE;
  DROP TABLE "galleries_images" CASCADE;
  DROP TABLE "galleries_images_locales" CASCADE;
  DROP TABLE "galleries" CASCADE;
  DROP TABLE "galleries_locales" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_locales" CASCADE;
  DROP TABLE "about_page_faq" CASCADE;
  DROP TABLE "about_page_faq_locales" CASCADE;
  DROP TABLE "about_page_press" CASCADE;
  DROP TABLE "about_page_brand_assets" CASCADE;
  DROP TABLE "about_page" CASCADE;
  DROP TABLE "about_page_locales" CASCADE;
  DROP TABLE "membership_page_tiers_benefits" CASCADE;
  DROP TABLE "membership_page_tiers_benefits_locales" CASCADE;
  DROP TABLE "membership_page_tiers" CASCADE;
  DROP TABLE "membership_page_tiers_locales" CASCADE;
  DROP TABLE "membership_page" CASCADE;
  DROP TABLE "membership_page_locales" CASCADE;
  DROP TABLE "awards_page" CASCADE;
  DROP TABLE "awards_page_locales" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_home_page_happening_now_mode";`)
}
