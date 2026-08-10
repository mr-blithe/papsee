CREATE TABLE "pap_channel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"day_id" uuid NOT NULL,
	"session_index" integer NOT NULL,
	"channel_id" text NOT NULL,
	"start_ms" bigint NOT NULL,
	"interval_ms" double precision NOT NULL,
	"unit" text NOT NULL,
	"scale" double precision NOT NULL,
	"offset" double precision NOT NULL,
	"samples" "bytea" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pap_day" ADD COLUMN "filled_at" timestamp;--> statement-breakpoint
ALTER TABLE "pap_event" ADD COLUMN "session_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pap_channel" ADD CONSTRAINT "pap_channel_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pap_channel" ADD CONSTRAINT "pap_channel_day_id_pap_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."pap_day"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pap_channel_day_session_channel_idx" ON "pap_channel" USING btree ("day_id","session_index","channel_id");--> statement-breakpoint
CREATE INDEX "pap_channel_day_idx" ON "pap_channel" USING btree ("day_id");