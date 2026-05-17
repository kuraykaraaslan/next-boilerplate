'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { SamlConfigForm } from '@/modules_next/auth_saml/ui/SamlConfigForm';
import type { SafeSystemSamlConfig } from '@/modules/auth_saml/auth_saml.types';
import type { UpsertSamlConfigInput } from '@/modules/auth_saml/auth_saml.dto';

/**
 * System-scope SAML IdP configuration. Single config row backs the system
 * Connected Accounts SAML link button. Admin-only.
 */
export default function SystemSamlConfigPage() {
  const [config, setConfig] = useState<SafeSystemSamlConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/system/api/saml-system/config')
      .then((res) => setConfig(res.data.config))
      .catch((e) => setError(e.response?.data?.message ?? 'Failed to load SAML config'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (input: UpsertSamlConfigInput) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.put('/system/api/saml-system/config', input);
      setConfig(res.data.config);
      setSuccess('System SAML configuration saved.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, []);

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
          { label: 'Admin', href: '/system/admin' },
          { label: 'System SAML' },
        ]}
      />

      <PageHeader
        title="System SAML SSO"
        subtitle="System-scope SAML IdP — drives the Connected Accounts SAML link flow on the system /me page."
      />

      {success && <AlertBanner variant="success" message={success} />}

      <SamlConfigForm
        scopeLabel="the system"
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
              {typeof window !== 'undefined' ? window.location.origin : ''}/system/api/auth/saml/metadata
            </span>
          </div>
          <div>
            <span className="text-text-secondary mr-2">ACS (Callback):</span>
            <span className="text-text-primary break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/system/api/auth/saml/callback
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
