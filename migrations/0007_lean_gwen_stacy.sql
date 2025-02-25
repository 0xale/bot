ALTER TABLE "posts_table" RENAME COLUMN "activity_id" TO "proposal_id";--> statement-breakpoint
ALTER TABLE "posts_table" DROP CONSTRAINT "posts_table_activity_id_activities_table_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts_table" ADD CONSTRAINT "posts_table_proposal_id_proposals_table_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals_table"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
