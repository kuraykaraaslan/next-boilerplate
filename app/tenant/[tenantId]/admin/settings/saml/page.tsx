'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faSliders, faCode } from '@fortawesome/free-solid-svg-icons';
import { SamlConfigForm } from '@/modules_next/auth_saml/ui/SamlConfigForm';
import { SamlAttributeForm } from '@/modules_next/auth_saml/ui/SamlAttributeForm';
import { SamlMetadataCard } from '@/modules_next/auth_saml/ui/SamlMetadataCard';
import type { SafeSamlConfig, SamlMetadata } from '@/modules/auth_saml/auth_saml.types';
import type { UpsertSamlConfigInput } from '@/modules/auth_saml/auth_saml.dto';

export default function TenantSamlPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [config, setConfig] = useState<SafeSamlConfig | null>(null);
  const [metadata, setMetadata] = useState<SamlMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/tenant/${tenantId}/api/saml/config`)
      .then((res) => {
        setConfig(res.data.config);
        setMetadata(res.data.metadata);
      })
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
          { label: 'Settings', href: `/tenant/${tenantId}/admin/settings` },
          { label: 'SAML SSO' },
        ]}
      />

      <PageHeader
        title="SAML SSO"
        subtitle="Configure enterprise Single Sign-On with your Identity Provider"
      />

      {success && <AlertBanner variant="success" message={success} />}

      <TabGroup
        label="SAML SSO Settings"
        tabs={[
          {
            id: 'idp',
            label: 'Identity Provider',
            icon: <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5" />,
            content: (
              <SamlConfigForm
                tenantId={tenantId}
                config={config}
                onSave={save}
                saving={saving}
                error={error}
              />
            ),
          },
          {
            id: 'mapping',
            label: 'Attribute Mapping',
            icon: <FontAwesomeIcon icon={faSliders} className="w-3.5 h-3.5" />,
            content: (
              <SamlAttributeForm
                config={config}
                onSave={save}
                saving={saving}
              />
            ),
          },
          {
            id: 'metadata',
            label: 'SP Metadata',
            icon: <FontAwesomeIcon icon={faCode} className="w-3.5 h-3.5" />,
            content: (
              <SamlMetadataCard
                tenantId={tenantId}
                metadata={metadata}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
