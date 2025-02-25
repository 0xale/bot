CREATE TABLE IF NOT EXISTS "visits_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"spot_id" serial NOT NULL,
	CONSTRAINT "visits_table_user_id_spot_id_unique" UNIQUE("user_id","spot_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits_table" ADD CONSTRAINT "visits_table_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users_table" DROP COLUMN IF EXISTS "spots";