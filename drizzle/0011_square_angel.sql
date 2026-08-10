CREATE TABLE "therapy_share" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "therapy_share" ADD CONSTRAINT "therapy_share_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "therapy_share_token_idx" ON "therapy_share" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "therapy_share_user_idx" ON "therapy_share" USING btree ("user_id");