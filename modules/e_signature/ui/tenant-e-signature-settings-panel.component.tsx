'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Toggle } from '@kuraykaraaslan/common/ui/toggle.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faKey, faIdCard, faGlobe, faFingerprint, faLink } from '@fortawesome/free-solid-svg-icons';

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
    smartIdBaseUrl: '',
    smartIdRelyingPartyUuid: '',
    smartIdRelyingPartyName: '',
    bankIdSeBaseUrl: '',
    loginGovClientId: '',
    loginGovRedirectUri: '',
  });

  function b(v: string | undefined) { return v === 'true'; }
  function bStr(v: boolean) { return v ? 'true' : 'false'; }

  const refresh = useCallback(async () => {
    try {
      const res = await api.get(`/tenant/${tenantId}/api/e-signature/settings`);
      const data = (res.data?.data ?? {}) as SR;
      setRemote(data);
      setF({
        eidEnabled: b(data.eidEnabled),
        eidRequiredLoA: data.eidRequiredLoA ?? '',
        mobilImzaAggregatorApiKey: data.mobilImzaAggregatorApiKey ?? '',
        mobilImzaAggregatorCustomerCode: data.mobilImzaAggregatorCustomerCode ?? '',
        smartIdBaseUrl: data.smartIdBaseUrl ?? '',
        smartIdRelyingPartyUuid: data.smartIdRelyingPartyUuid ?? '',
        smartIdRelyingPartyName: data.smartIdRelyingPartyName ?? '',
        bankIdSeBaseUrl: data.bankIdSeBaseUrl ?? '',
        loginGovClientId: data.loginGovClientId ?? '',
        loginGovRedirectUri: data.loginGovRedirectUri ?? '',
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
      await api.put(`/tenant/${tenantId}/api/e-signature/settings`, { settings: patch });
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

      <Card title="Smart-ID relying party (Baltics — EE / LV / LT)"
        subtitle="Use a dedicated SK ID Solutions relying-party account for this workspace. When a field is blank, the workspace falls back to the system-wide Smart-ID configuration.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save({
              smartIdBaseUrl: f.smartIdBaseUrl,
              smartIdRelyingPartyUuid: f.smartIdRelyingPartyUuid,
              smartIdRelyingPartyName: f.smartIdRelyingPartyName,
            });
          }}
          className="space-y-4"
        >
          <Input
            id="tenantSmartIdRpUuid"
            label="Relying party UUID"
            prefixIcon={<FontAwesomeIcon icon={faFingerprint} className="w-3.5 h-3.5" />}
            value={f.smartIdRelyingPartyUuid}
            onChange={(e) => setF((p) => ({ ...p, smartIdRelyingPartyUuid: e.target.value }))}
          />
          <Input
            id="tenantSmartIdRpName"
            label="Relying party name"
            prefixIcon={<FontAwesomeIcon icon={faIdCard} className="w-3.5 h-3.5" />}
            value={f.smartIdRelyingPartyName}
            onChange={(e) => setF((p) => ({ ...p, smartIdRelyingPartyName: e.target.value }))}
          />
          <Input
            id="tenantSmartIdBaseUrl"
            label="API base URL"
            placeholder="Leave blank to use the system endpoint"
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            value={f.smartIdBaseUrl}
            onChange={(e) => setF((p) => ({ ...p, smartIdBaseUrl: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>Save</Button>
          </div>
        </form>
      </Card>

      <Card title="BankID relying party (Sweden)"
        subtitle="Point this workspace at its own BankID RP endpoint. The mTLS client certificate and key remain system-level (configured via environment); leave the base URL blank to inherit the system endpoint.">
        <form
          onSubmit={(e) => { e.preventDefault(); save({ bankIdSeBaseUrl: f.bankIdSeBaseUrl }); }}
          className="space-y-4"
        >
          <Input
            id="tenantBankIdSeBaseUrl"
            label="API base URL"
            placeholder="Leave blank to use the system endpoint"
            prefixIcon={<FontAwesomeIcon icon={faGlobe} className="w-3.5 h-3.5" />}
            value={f.bankIdSeBaseUrl}
            onChange={(e) => setF((p) => ({ ...p, bankIdSeBaseUrl: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>Save</Button>
          </div>
        </form>
      </Card>

      <Card title="Login.gov OIDC client (United States)"
        subtitle="Register this workspace's own Login.gov OIDC client. When blank, the workspace falls back to the system-wide Login.gov client. Login.gov uses an OIDC redirect flow rather than QR/PIN polling.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save({ loginGovClientId: f.loginGovClientId, loginGovRedirectUri: f.loginGovRedirectUri });
          }}
          className="space-y-4"
        >
          <Input
            id="tenantLoginGovClientId"
            label="Client ID"
            prefixIcon={<FontAwesomeIcon icon={faIdCard} className="w-3.5 h-3.5" />}
            value={f.loginGovClientId}
            onChange={(e) => setF((p) => ({ ...p, loginGovClientId: e.target.value }))}
          />
          <Input
            id="tenantLoginGovRedirectUri"
            label="Redirect URI"
            prefixIcon={<FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" />}
            value={f.loginGovRedirectUri}
            onChange={(e) => setF((p) => ({ ...p, loginGovRedirectUri: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>Save</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
