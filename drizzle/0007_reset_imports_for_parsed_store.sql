-- Imports committed before the parsed store have bytes but no pap_channel rows, so their nights
-- would open empty. There is no reader history worth keeping yet, so they are cleared and re-imported
-- rather than backfilled.
TRUNCATE TABLE "pap_import" CASCADE;
