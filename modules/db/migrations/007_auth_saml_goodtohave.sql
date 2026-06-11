-- 007_auth_saml_goodtohave.sql
--
-- Adds the columns backing the auth_saml GOODTOHAVE features:
--   * security     — per-tenant signatureAlgorithm / clockSkewMs / wantAssertionsSigned
--                    (wire previously-hardcoded SAML client knobs to the entity),
--                    dual-cert rotation slot (spPrivateKeySecondary / spCertificateSecondary),
--                    IdP cert expiry tracking (idpCertNotAfter)
--   * compliance   — IdP SLO endpoint (idpSloUrl), ABAC role-mapping rules (roleMappingRules)
--   * multi-tenancy— SessionNotOnOrAfter honouring (honorSessionNotOnOrAfter),
--                    metadata auto-import source (idpMetadataUrl)
--
-- Column identifiers are quoted camelCase to match the TypeORM entity property
-- names (the project uses no snake_case naming strategy — see other migrations).
-- Every column is nullable or DB-defaulted so this is non-destructive on existing
-- rows and matches what `synchronize: true` produces in development.
--
-- Idempotent: safe to re-run.

ALTER TABLE "saml_configs"
  ADD COLUMN IF NOT EXISTS "idpSloUrl"                 text     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "idpMetadataUrl"            text     NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "idpCertNotAfter"           timestamp,
  ADD COLUMN IF NOT EXISTS "spPrivateKeySecondary"     text,
  ADD COLUMN IF NOT EXISTS "spCertificateSecondary"    text,
  ADD COLUMN IF NOT EXISTS "roleMappingRules"          jsonb,
  ADD COLUMN IF NOT EXISTS "signatureAlgorithm"        varchar(16) NOT NULL DEFAULT 'sha256',
  ADD COLUMN IF NOT EXISTS "clockSkewMs"               integer  NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS "wantAssertionsSigned"      boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "honorSessionNotOnOrAfter"  boolean  NOT NULL DEFAULT true;
