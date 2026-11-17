import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "about_page_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "about_page_stats_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "news" ADD COLUMN "author_member_id" integer;
  ALTER TABLE "about_page_press" ADD COLUMN "date" timestamp(3) with time zone;
  ALTER TABLE "about_page_stats" ADD CONSTRAINT "about_page_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_stats_locales" ADD CONSTRAINT "about_page_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_stats"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "about_page_stats_order_idx" ON "about_page_stats" USING btree ("_order");
  CREATE INDEX "about_page_stats_parent_id_idx" ON "about_page_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "about_page_stats_locales_locale_parent_id_unique" ON "about_page_stats_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "news" ADD CONSTRAINT "news_author_member_id_board_members_id_fk" FOREIGN KEY ("author_member_id") REFERENCES "public"."board_members"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "news_author_member_idx" ON "news" USING btree ("author_member_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "about_page_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about_page_stats_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "about_page_stats" CASCADE;
  DROP TABLE "about_page_stats_locales" CASCADE;
  ALTER TABLE "news" DROP CONSTRAINT "news_author_member_id_board_members_id_fk";
  
  DROP INDEX "news_author_member_idx";
  ALTER TABLE "news" DROP COLUMN "author_member_id";
  ALTER TABLE "about_page_press" DROP COLUMN "date";`)
}
