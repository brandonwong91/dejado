ALTER TABLE "articles" ADD COLUMN "last_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "update_summary" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "reviewed_at" timestamp;