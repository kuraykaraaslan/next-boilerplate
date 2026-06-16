-- 004_api_key_lifecycle_security.sql
--
-- Adds the columns backing the expanded api_key capabilities:
--   * environment   — `keyEnv` ('live' | 'test') baked into the raw-key prefix
--                      (sk_live_… / sk_test_…) for environment separation
--   * network       — per-key IP/CIDR allowlist
--   * observability — successful-use counter + last source IP (anomaly signal)
--   * lifecycle     — successor key id (rotation grace-window pointer)
--
-- Column identifiers are quoted camelCase to match the TypeORM entity property
-- names (the project uses no snake_case naming strategy — see other migrations).
-- Every column is nullable or DB-defaulted so this is non-destructive on existing
-- rows and matches what `synchronize: true` produces in development.
--
-- Idempotent: safe to re-run.

ALTER TABLE "api_keys"
  ADD COLUMN IF NOT EXISTS "keyEnv"         varchar  NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS "ipAllowlist"    text     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastUsedIp"     varchar,
  ADD COLUMN IF NOT EXISTS "usageCount"     integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "successorKeyId" uuid;
