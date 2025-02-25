CREATE TABLE IF NOT EXISTS "likes_table" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	CONSTRAINT "likes_table_user_id_post_id_unique" UNIQUE("user_id","post_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "likes_table" ADD CONSTRAINT "likes_table_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "likes_table" ADD CONSTRAINT "likes_table_post_id_posts_table_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts_table"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
