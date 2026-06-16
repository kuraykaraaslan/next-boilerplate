'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { Card } from '@nb/common/ui/Card';
import { Spinner } from '@nb/common/ui/Spinner';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { Breadcrumb } from '@nb/common/ui/Breadcrumb';
import { SamlConfigForm } from '@nb/auth_saml/ui/SamlConfigForm';
import type { SafeSamlConfig } from '@nb/auth_saml/server/auth_saml.types';
import type { UpsertSamlConfigInput } from '@nb/auth_saml/server/auth_saml.dto';

/**
 * Tenant SAML IdP configuration. Each tenant owns one `SamlConfig` row keyed
 * by its own tenantId — the root tenant's row is the platform-wide config,
 * other tenants' rows configure their own customer-facing SSO.
 *
 * Lives under `/saml/settings`; the parent `/saml` page is the operational
 * dashboard (status, SSO activity, JIT/login stats).
 */
export default function TenantSamlSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [config, setConfig] = useState<SafeSamlConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/tenant/${tenantId}/api/saml/config`)
      .then((res) => setConfig(res.data.config))
      .catch((e) => setError(e.response?.data?.message ?? 'Failed to load SAML config'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (input: UpsertSamlConfigInput) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.put(`/tenant/${tenantId}/api/saml/config`, input);
      setConfig(res.data.config);
      setSuccess('SAML configuration saved.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin', href: `/tenant/${tenantId}/admin` },
          { label: 'SAML SSO', href: `/tenant/${tenantId}/admin/saml` },
          { label: 'Settings' },
        ]}
      />

      <PageHeader
        title="SAML Settings"
        subtitle="Configure this tenant's SAML Identity Provider integration."
      />

      {success && <AlertBanner variant="success" message={success} />}

      <SamlConfigForm
        scopeLabel="this tenant"
        config={config}
        onSave={save}
        saving={saving}
        error={error}
      />

      <Card title="SAML Endpoints" subtitle="Register these with your Identity Provider">
        <div className="space-y-3 font-mono text-xs">
          <div>
            <span className="text-text-secondary mr-2">Entity ID / Metadata:</span>
            <span className="text-text-primary break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/tenant/{tenantId}/api/auth/saml/metadata
            </span>
          </div>
          <div>
            <span className="text-text-secondary mr-2">ACS (Callback):</span>
            <span className="text-text-primary break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/tenant/{tenantId}/api/auth/saml/callback
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
