-- Accounts that predate the new-browser code have no two_factor row, and Better Auth refuses to
-- verify a code for an account without one, so without this they would silently never be asked.
-- The seeded row matches what src/lib/two-factor-enrolment.ts writes: no authenticator secret and
-- an empty backup code list.
UPDATE "user" SET "two_factor_enabled" = true;--> statement-breakpoint
INSERT INTO "two_factor" ("id", "user_id", "secret", "backup_codes", "verified")
SELECT gen_random_uuid()::text, "user"."id", '', '[]', true
FROM "user"
WHERE NOT EXISTS (SELECT 1 FROM "two_factor" WHERE "two_factor"."user_id" = "user"."id");
