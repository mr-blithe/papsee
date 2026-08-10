DROP INDEX "pap_file_import_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "pap_file_import_path_idx" ON "pap_file" USING btree ("import_id","path");