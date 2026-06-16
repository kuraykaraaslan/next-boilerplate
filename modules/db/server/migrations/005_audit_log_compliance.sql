-- 005_audit_log_compliance.sql
--
-- Adds the columns + indexes backing the audit_log GOODTOHAVE features:
--   * severity          — risk classification (low|medium|high|critical), drives
--                          triage, severity filtering, and the high-risk webhook
--   * onBehalfOfActorId — dual-actor (impersonation) context: the impersonated
--                          user, while actorId stays the TRUE actor
--   * prevHash/rowHash  — append-only hash chain (tamper evidence). rowHash =
--                          sha256(prevHash + canonical(row)), chained per tenant
--   * deletedAt         — soft-delete guard (normal reads exclude soft-deleted;
--                          retention purge hard-deletes after archive)
--   * compound index    — (tenantId, createdAt DESC) for the hot read path
--
-- Column identifiers are quoted camelCase to match the TypeORM entity property
-- names (the project uses no snake_case naming strategy — see other migrations).
-- Every column is nullable or DB-defaulted so this is non-destructive on existing
-- rows and matches what `synchronize: true` produces in development.
--
-- Idempotent: safe to re-run.

ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "severity"          varchar   NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS "onBehalfOfActorId" uuid,
  ADD COLUMN IF NOT EXISTS "prevHash"          varchar,
  ADD COLUMN IF NOT EXISTS "rowHash"           varchar,
  ADD COLUMN IF NOT EXISTS "deletedAt"         timestamp;

-- Compound index backing getAll's hot path (filter tenantId, order createdAt DESC).
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_tenant_created"
  ON "audit_logs" ("tenantId", "createdAt" DESC);

-- Secondary indexes for the new filterable / correlatable columns.
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_severity"
  ON "audit_logs" ("severity");

CREATE INDEX IF NOT EXISTS "IDX_audit_logs_on_behalf_of_actor"
  ON "audit_logs" ("onBehalfOfActorId");
