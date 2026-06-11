-- 002_drop_api_key_keyprefix.sql
--
-- Drop the display-only `keyPrefix` column from `api_keys`.
--
-- The raw key is shown exactly once at creation time and only its SHA-256
-- `keyHash` is persisted. The truncated prefix was a UI convenience that we no
-- longer surface anywhere, so the column is removed entirely.
--
-- Idempotent: safe to re-run against an already-migrated database.

ALTER TABLE "api_keys" DROP COLUMN IF EXISTS "keyPrefix";
