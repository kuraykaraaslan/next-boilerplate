-- 003_webhook_endpoint_capabilities.sql
--
-- Adds the columns backing the expanded webhook capabilities:
--   * endpoint config   — custom request headers, per-event payload filters, tags
--   * reliability        — consecutive-failure counter + auto-disable timestamp,
--                          per-endpoint rate limit
--   * security           — destination IP/CIDR allowlist (SSRF override)
-- plus an index on webhook_deliveries(event) for the metrics aggregation.
--
-- Column identifiers are quoted camelCase to match the TypeORM entity property
-- names (the project uses no snake_case naming strategy — see other migrations).
-- Every column is nullable or DB-defaulted so this is non-destructive on existing
-- rows and matches what `synchronize: true` produces in development.
--
-- Idempotent: safe to re-run.

ALTER TABLE webhooks
  ADD COLUMN IF NOT EXISTS "headers"             jsonb,
  ADD COLUMN IF NOT EXISTS "eventFilters"        jsonb,
  ADD COLUMN IF NOT EXISTS "tags"                text,
  ADD COLUMN IF NOT EXISTS "consecutiveFailures" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "autoDisabledAt"      timestamp,
  ADD COLUMN IF NOT EXISTS "ipAllowlist"         jsonb,
  ADD COLUMN IF NOT EXISTS "rateLimitPerMinute"  integer;

-- Speeds up per-event metrics grouping on the delivery log.
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_event"
  ON webhook_deliveries ("event");
