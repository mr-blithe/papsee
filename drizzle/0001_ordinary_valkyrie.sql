CREATE TABLE "pap_day" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"import_id" uuid NOT NULL,
	"date" text NOT NULL,
	"start_ms" bigint NOT NULL,
	"end_ms" bigint NOT NULL,
	"usage_minutes" real NOT NULL,
	"ahi" real NOT NULL,
	"leak_p95" real,
	"pressure_p95" real,
	"summary" jsonb,
	"settings" jsonb,
	"session_bounds" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pap_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"day_id" uuid NOT NULL,
	"type" text NOT NULL,
	"start_ms" bigint NOT NULL,
	"duration_ms" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pap_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"import_id" uuid NOT NULL,
	"day_id" uuid,
	"path" text NOT NULL,
	"bytes" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pap_import" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"brand" text,
	"device" jsonb,
	"setting_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unreadable" text[] DEFAULT '{}' NOT NULL,
	"file_count" integer DEFAULT 0 NOT NULL,
	"committed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"birth_year" integer,
	"height_cm" integer,
	"weight_kg" real,
	"diagnosed_on" text,
	"diagnosis_ahi" real,
	"device_guide" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pap_day" ADD CONSTRAINT "pap_day_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pap_day" ADD CONSTRAINT "pap_day_import_id_pap_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."pap_import"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pap_event" ADD CONSTRAINT "pap_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pap_event" ADD CONSTRAINT "pap_event_day_id_pap_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."pap_day"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pap_file" ADD CONSTRAINT "pap_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pap_file" ADD CONSTRAINT "pap_file_import_id_pap_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."pap_import"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pap_file" ADD CONSTRAINT "pap_file_day_id_pap_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."pap_day"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pap_import" ADD CONSTRAINT "pap_import_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profile" ADD CONSTRAINT "patient_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pap_day_user_date_idx" ON "pap_day" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "pap_day_import_idx" ON "pap_day" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "pap_event_day_idx" ON "pap_event" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "pap_file_import_idx" ON "pap_file" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "pap_file_day_idx" ON "pap_file" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "pap_import_user_idx" ON "pap_import" USING btree ("user_id");