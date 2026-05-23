-- ============================================================================
-- Migration 001 — Postgres Row-Level Security for tenant-scoped tables
-- ============================================================================
--
-- Defense-in-depth on top of the application-layer `where: { tenantId }`
-- guards. Every connection sets the per-request tenant ID once
--
--     SET LOCAL app.current_tenant = '<tenant-uuid>';
--
-- and Postgres refuses to return / mutate rows whose `tenantId` column
-- doesn't match. A forgotten `where` clause in a service is then a
-- silently-empty result instead of a cross-tenant leak.
--
-- USAGE FROM THE APP
-- ------------------
-- `tenantDataSourceFor(tenantId)` should issue
--
--     SET LOCAL app.current_tenant = $1
--
-- at the start of every connection-checkout (TypeORM `query` hook or a
-- DataSource subscriber). The session variable resets at COMMIT/ROLLBACK
-- so each request gets a fresh value.
--
-- BYPASS — for jobs that legitimately need cross-tenant access (cron
-- purges, platform-admin tooling), connect as a role that has BYPASSRLS
-- (e.g. a `tenant_admin` Postgres role) and set
--
--     SET LOCAL app.bypass_rls = 'on';
--
-- which the policies below honour. Never grant BYPASSRLS to the app's
-- normal connection role.
-- ============================================================================

-- Helper: current tenant from session, NULL if unset.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS UUID AS $$
DECLARE
  v TEXT;
BEGIN
  v := current_setting('app.current_tenant', true);
  IF v IS NULL OR v = '' THEN
    RETURN NULL;
  END IF;
  RETURN v::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper: true when the session has explicitly opted into bypass.
CREATE OR REPLACE FUNCTION app_rls_bypass() RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('app.bypass_rls', true), 'off') = 'on';
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── Tenant-scoped tables ────────────────────────────────────────────────────
-- Every table here carries a `"tenantId" UUID NOT NULL` column.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'tenants',
    'tenant_domains',
    'tenant_members',
    'tenant_invitations',
    'tenant_subscriptions',
    'tenant_usage',
    'settings',
    'audit_logs',
    'api_keys',
    'payments',
    'payment_transactions',
    'subscription_plans',
    'plan_features',
    'coupons',
    'coupon_redemptions',
    'webhooks',
    'webhook_deliveries',
    'saml_configs',
    'push_subscriptions',
    'uploaded_files',
    'ai_usage_logs',
    'notification_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- The `tenants` table key is its own primary key; for everyone else
    -- the column is `"tenantId"`.
    IF t = 'tenants' THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS tenant_self ON %I', t);
      EXECUTE format($f$
        CREATE POLICY tenant_self ON %I
          USING (app_rls_bypass() OR "tenantId" = app_current_tenant())
          WITH CHECK (app_rls_bypass() OR "tenantId" = app_current_tenant())
      $f$, t);
    ELSE
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
      EXECUTE format($f$
        CREATE POLICY tenant_isolation ON %I
          USING (app_rls_bypass() OR "tenantId" = app_current_tenant())
          WITH CHECK (app_rls_bypass() OR "tenantId" = app_current_tenant())
      $f$, t);
    END IF;
  END LOOP;
END $$;

-- ─── Cross-tenant tables (User family + e-signature + trust list) ───────────
-- These rows are global by design (a single User maps to N tenants via
-- TenantMember). Leave RLS off so the app can read them without a tenant
-- context — the security boundary is the JWT (session ownership), not RLS.
--
-- Tables intentionally NOT covered by tenant RLS:
--   users, user_profiles, user_securities, user_preferences,
--   user_sessions, user_social_accounts,
--   signing_certificates, trust_list_entries,
--   tenant_databases

-- ─── Roles (operator setup, not idempotent in dev — keep commented) ──────────
-- Production deploys should create two roles:
--
--   CREATE ROLE app_runtime LOGIN PASSWORD '...';      -- normal connections
--   CREATE ROLE app_admin   LOGIN PASSWORD '...' BYPASSRLS;  -- cron / migrations
--
-- and grant table privileges accordingly. The app's TypeORM DataSource uses
-- `app_runtime` (RLS-enforced); CLI scripts use `app_admin`.
