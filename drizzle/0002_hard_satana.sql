CREATE TABLE "daily_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_read" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "series_type" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "tier_query" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "last_validated_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_summaries_user_date_idx" ON "daily_summaries" USING btree ("user_id","date");