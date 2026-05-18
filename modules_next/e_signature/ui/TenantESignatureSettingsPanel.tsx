'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { Card } from '@/modules_next/common/ui/Card';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { Select } from '@/modules_next/common/ui/Select';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faKey, faIdCard, faShieldHalved } from '@fortawesome/free-solid-svg-icons';

type SR = Record<string, string>;

const LOA_OPTIONS = [
  { value: '', label: 'Use system default' },
  { value: 'low', label: 'Low' },
  { value: 'substantial', label: 'Substantial' },
  { value: 'high', label: 'High (QES — recommended)' },
];

export function TenantESignatureSettingsPanel({ tenantId }: { tenantId: string }) {
  const [remote, setRemote] = useState<SR>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [f, setF] = useState({
    eidEnabled: false,
    eidRequiredLoA: '',
    mobilImzaAggregatorApiKey: '',
    mobilImzaAggregatorCustomerCode: '',
  });

  function b(v: string | undefined) { return v === 'true'; }
  function bStr(v: boolean) { return v ? 'true' : 'false'; }

  const refresh = useCallback(async () => {
    try {
      const res = await api.get(`/tenant/${tenantId}/api/admin/e-signature/settings`);
      const data = (res.data?.data ?? {}) as SR;
      setRemote(data);
      setF({
        eidEnabled: b(data.eidEnabled),
        eidRequiredLoA: data.eidRequiredLoA ?? '',
        mobilImzaAggregatorApiKey: data.mobilImzaAggregatorApiKey ?? '',
        mobilImzaAggregatorCustomerCode: data.mobilImzaAggregatorCustomerCode ?? '',
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(ax.response?.data?.error?.message ?? ax.message ?? 'Failed to load tenant e-signature settings.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save(partial: Partial<typeof f>) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const patch: SR = {};
      for (const [k, v] of Object.entries(partial)) {
        if (typeof v === 'boolean') patch[k] = bStr(v);
        else if (typeof v === 'string') patch[k] = v;
      }
      await api.put(`/tenant/${tenantId}/api/admin/e-signature/settings`, { settings: patch });
      await refresh();
      setNotice('Saved.');
      setTimeout(() => setNotice(''), 4000);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(ax.response?.data?.error?.message ?? ax.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner size="md" /></div>;
  }

  return (
    <div className="space-y-6">
      {error && <AlertBanner variant="error" message={error} dismissible />}
      {notice && <AlertBanner variant="success" message={notice} dismissible />}

      <Card title="Workspace policy"
        subtitle="Override the system-level e-signature policy for this workspace. Leave the LoA field on 'Use system default' to inherit the global setting.">
        <form
          onSubmit={(e) => { e.preventDefault(); save({ eidEnabled: f.eidEnabled, eidRequiredLoA: f.eidRequiredLoA }); }}
          className="space-y-4"
        >
          <Toggle
            id="tenantEidEnabled"
            label="Allow e-signature sign-in for this workspace"
            description="When off, e-signature login is hidden from this workspace's login page even if it is enabled system-wide."
            checked={f.eidEnabled}
            onChange={(v) => setF((p) => ({ ...p, eidEnabled: v }))}
          />
          <Select
            id="tenantEidLoA"
            label="Minimum Level of Assurance (eIDAS)"
            options={LOA_OPTIONS}
            value={f.eidRequiredLoA}
            onChange={(e) => setF((p) => ({ ...p, eidRequiredLoA: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>Save</Button>
          </div>
        </form>
      </Card>

      <Card title="Workspace aggregator credentials (Turkey — Mobil Imza)"
        subtitle="Use a dedicated aggregator account for this workspace. When unset, the workspace falls back to the system-wide credentials. Sensitive values are encrypted at rest; existing values are shown as ***SET***.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save({
              mobilImzaAggregatorApiKey: f.mobilImzaAggregatorApiKey,
              mobilImzaAggregatorCustomerCode: f.mobilImzaAggregatorCustomerCode,
            });
          }}
          className="space-y-4"
        >
          <Input
            id="tenantMobilImzaCustomerCode"
            label="Customer code"
            prefixIcon={<FontAwesomeIcon icon={faIdCard} className="w-3.5 h-3.5" />}
            value={f.mobilImzaAggregatorCustomerCode}
            onChange={(e) => setF((p) => ({ ...p, mobilImzaAggregatorCustomerCode: e.target.value }))}
          />
          <Input
            id="tenantMobilImzaApiKey"
            label="API key"
            type="password"
            prefixIcon={<FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />}
            value={f.mobilImzaAggregatorApiKey}
            placeholder={remote.mobilImzaAggregatorApiKey === '***SET***' ? 'Leave blank to keep the existing key' : ''}
            onChange={(e) => setF((p) => ({ ...p, mobilImzaAggregatorApiKey: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>Save</Button>
          </div>
        </form>
      </Card>

      <Card title="Other regions" subtitle="Workspaces inherit system-level providers for non-Turkish regions today. Per-tenant credentials for Smart-ID (EE/LV/LT), BankID (SE) and Login.gov (US) will be configurable here in v1.2.">
        <div className="flex items-start gap-3 text-sm text-text-secondary">
          <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4 mt-0.5" />
          <p>
            Smart-ID, BankID and Login.gov configuration is currently shared across all workspaces and is managed in
            {' '}<a className="text-primary underline" href="/system/admin/settings#e-signature">System Settings → E-Signature</a>.
          </p>
        </div>
      </Card>
    </div>
  );
}
