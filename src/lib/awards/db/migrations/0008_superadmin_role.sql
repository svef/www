-- Widens the role CHECK to accept 'superadmin' (an admin other admins cannot manage). Every
-- value it accepted before is still accepted, so code on main keeps working.
ALTER TABLE "user_role" DROP CONSTRAINT "user_role_role_check";--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_check" CHECK ("user_role"."role" in ('admin', 'superadmin', 'staff'));
