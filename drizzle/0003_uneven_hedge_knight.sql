CREATE TABLE "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"mode" text DEFAULT 'assistant' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"mode" text DEFAULT 'assistant' NOT NULL,
	"starter_id" uuid,
	"char_count" integer DEFAULT 0 NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"sentence_count" integer DEFAULT 0 NOT NULL,
	"question_count" integer DEFAULT 0 NOT NULL,
	"exclamation_count" integer DEFAULT 0 NOT NULL,
	"emoji_count" integer DEFAULT 0 NOT NULL,
	"hedge_count" integer DEFAULT 0 NOT NULL,
	"intensifier_count" integer DEFAULT 0 NOT NULL,
	"uppercase_ratio" real DEFAULT 0 NOT NULL,
	"first_person_ratio" real DEFAULT 0 NOT NULL,
	"second_person_ratio" real DEFAULT 0 NOT NULL,
	"collective_ratio" real DEFAULT 0 NOT NULL,
	"avg_word_length" real DEFAULT 0 NOT NULL,
	"type_token_ratio" real DEFAULT 0 NOT NULL,
	"cap_style" text DEFAULT 'sentence' NOT NULL,
	"response_latency_ms" integer,
	"local_hour" integer DEFAULT 0 NOT NULL,
	"local_dow" integer DEFAULT 0 NOT NULL,
	"enriched_at" timestamp,
	"enrich_attempts" integer DEFAULT 0 NOT NULL,
	"signals" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_starters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"kind" text NOT NULL,
	"anchor_slug" text,
	"rationale" text,
	"score" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"shown_at" timestamp,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_configs" (
	"user_id" text PRIMARY KEY NOT NULL,
	"system_prompt" text NOT NULL,
	"style_params" text DEFAULT '{}' NOT NULL,
	"exemplars" text DEFAULT '[]' NOT NULL,
	"snapshot_id" uuid,
	"backing_message_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"last_built_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"profiling_enabled" text DEFAULT 'false' NOT NULL,
	"mirror_enabled" text DEFAULT 'false' NOT NULL,
	"consented_at" timestamp,
	"retention_days" integer DEFAULT 365 NOT NULL,
	"excluded_categories" text DEFAULT '[]' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"traits" text DEFAULT '{}' NOT NULL,
	"style" text DEFAULT '{}' NOT NULL,
	"top_topics" text DEFAULT '[]' NOT NULL,
	"values" text DEFAULT '[]' NOT NULL,
	"archetype" text,
	"confidence" real DEFAULT 0 NOT NULL,
	"source_message_count" integer DEFAULT 0 NOT NULL,
	"days_observed" integer DEFAULT 0 NOT NULL,
	"model_version" text DEFAULT 'v1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trait_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"trait" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"mention_count" integer DEFAULT 0 NOT NULL,
	"sentiment_avg" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'chat' NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "previous_amount" text;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_conversations_user_last_idx" ON "chat_conversations" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "chat_messages_user_created_idx" ON "chat_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_idx" ON "chat_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_enrich_queue_idx" ON "chat_messages" USING btree ("enriched_at","role");--> statement-breakpoint
CREATE INDEX "conversation_starters_user_status_idx" ON "conversation_starters" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_snapshots_user_date_idx" ON "profile_snapshots" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "trait_corrections_user_idx" ON "trait_corrections" USING btree ("user_id","trait");--> statement-breakpoint
CREATE UNIQUE INDEX "user_topics_user_slug_idx" ON "user_topics" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "user_topics_user_score_idx" ON "user_topics" USING btree ("user_id","score");