ALTER TABLE "activities_table" DROP CONSTRAINT "activities_table_proposal_id_proposals_table_id_fk";
--> statement-breakpoint
ALTER TABLE "proposals_table" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "visits_table" ADD COLUMN "visited_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "activities_table" DROP COLUMN IF EXISTS "proposal_id";