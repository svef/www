import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "home_page_hero_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  ALTER TABLE "home_page" ADD COLUMN "show_latest_news" boolean DEFAULT true;
  ALTER TABLE "home_page_locales" ADD COLUMN "hero_primary_label" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "hero_secondary_label" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "intro_band_text" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "events_section_heading" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "events_section_lead" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "events_section_link_label" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "news_section_heading" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "news_section_link_label" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "about_section_heading" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "about_section_text" varchar;
  ALTER TABLE "home_page_locales" ADD COLUMN "about_section_link_label" varchar;
  ALTER TABLE "home_page_hero_lines" ADD CONSTRAINT "home_page_hero_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_page_hero_lines_order_idx" ON "home_page_hero_lines" USING btree ("_order");
  CREATE INDEX "home_page_hero_lines_parent_id_idx" ON "home_page_hero_lines" USING btree ("_parent_id");
  CREATE INDEX "home_page_hero_lines_locale_idx" ON "home_page_hero_lines" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home_page_hero_lines" CASCADE;
  ALTER TABLE "home_page" DROP COLUMN "show_latest_news";
  ALTER TABLE "home_page_locales" DROP COLUMN "hero_primary_label";
  ALTER TABLE "home_page_locales" DROP COLUMN "hero_secondary_label";
  ALTER TABLE "home_page_locales" DROP COLUMN "intro_band_text";
  ALTER TABLE "home_page_locales" DROP COLUMN "events_section_heading";
  ALTER TABLE "home_page_locales" DROP COLUMN "events_section_lead";
  ALTER TABLE "home_page_locales" DROP COLUMN "events_section_link_label";
  ALTER TABLE "home_page_locales" DROP COLUMN "news_section_heading";
  ALTER TABLE "home_page_locales" DROP COLUMN "news_section_link_label";
  ALTER TABLE "home_page_locales" DROP COLUMN "about_section_heading";
  ALTER TABLE "home_page_locales" DROP COLUMN "about_section_text";
  ALTER TABLE "home_page_locales" DROP COLUMN "about_section_link_label";`)
}
