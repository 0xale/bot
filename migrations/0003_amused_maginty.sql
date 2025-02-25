DROP TABLE "visits_table";--> statement-breakpoint
ALTER TABLE "users_table" ADD COLUMN "spots" integer[] DEFAULT '{}' NOT NULL;