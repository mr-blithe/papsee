UPDATE "user" SET "two_factor_enabled" = true;--> statement-breakpoint
INSERT INTO "two_factor" ("id", "user_id", "secret", "backup_codes", "verified")
SELECT gen_random_uuid()::text, "user"."id", '', '[]', true
FROM "user"
WHERE NOT EXISTS (SELECT 1 FROM "two_factor" WHERE "two_factor"."user_id" = "user"."id");
