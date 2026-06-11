-- 006_auth_consent.sql
--
-- GTH-7: Consent-at-registration capture (GDPR Art. 7 / KVKK / LGPD Art. 8).
--
-- Creates the append-only `user_consents` table backing the auth module's
-- UserConsent entity. One row per consent event records which document
-- (ToS / Privacy Policy), which version, and when a user agreed — so a tenant
-- can prove consent and re-prompt on a document version bump.
--
-- Column identifiers are quoted camelCase to match the TypeORM entity property
-- names (the project uses no snake_case naming strategy — see other migrations).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "user_consents" (
  "userConsentId"   uuid        NOT NULL DEFAULT gen_random_uuid(),
  "userId"          uuid        NOT NULL,
  "tenantId"        uuid,
  "documentType"    varchar     NOT NULL DEFAULT 'terms_of_service',
  "documentVersion" varchar     NOT NULL,
  "locale"          varchar,
  "ipAddress"       varchar,
  "userAgent"       text,
  "createdAt"       timestamp   NOT NULL DEFAULT now(),
  CONSTRAINT "PK_user_consents" PRIMARY KEY ("userConsentId")
);

CREATE INDEX IF NOT EXISTS "IDX_user_consents_userId"       ON "user_consents" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_user_consents_tenantId"     ON "user_consents" ("tenantId");
CREATE INDEX IF NOT EXISTS "IDX_user_consents_documentType" ON "user_consents" ("documentType");
CREATE INDEX IF NOT EXISTS "IDX_user_consents_user_created" ON "user_consents" ("userId", "createdAt");
