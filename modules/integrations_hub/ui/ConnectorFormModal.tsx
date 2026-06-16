'use client';

import { useState } from 'react';
import { Button } from '@nb/common/ui/Button';
import { Input } from '@nb/common/ui/Input';
import { Select } from '@nb/common/ui/Select';
import { Modal } from '@nb/common/ui/Modal';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import type { ConnectorAuthType } from '@nb/integrations_hub/server/integrations_hub.enums';

type Form = {
  key: string;
  name: string;
  category: string;
  authType: ConnectorAuthType;
  iconUrl: string;
  oauthAuthUrl: string;
  oauthTokenUrl: string;
  oauthScopes: string;
  clientIdSettingKey: string;
  clientSecretSettingKey: string;
};

const EMPTY: Form = {
  key: '', name: '', category: 'other', authType: 'API_KEY', iconUrl: '',
  oauthAuthUrl: '', oauthTokenUrl: '', oauthScopes: '', clientIdSettingKey: '', clientSecretSettingKey: '',
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
};

export function ConnectorFormModal({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function field(key: keyof Form, value: string) { setForm((f) => ({ ...f, [key]: value })); }
  function handleClose() { setForm(EMPTY); setError(''); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await onSave({
        key: form.key.toLowerCase(),
        name: form.name,
        category: form.category || 'other',
        authType: form.authType,
        iconUrl: form.iconUrl || undefined,
        oauthAuthUrl: form.authType === 'OAUTH2' ? form.oauthAuthUrl || undefined : undefined,
        oauthTokenUrl: form.authType === 'OAUTH2' ? form.oauthTokenUrl || undefined : undefined,
        oauthScopes: form.authType === 'OAUTH2' && form.oauthScopes
          ? form.oauthScopes.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        clientIdSettingKey: form.authType === 'OAUTH2' ? form.clientIdSettingKey || undefined : undefined,
        clientSecretSettingKey: form.authType === 'OAUTH2' ? form.clientSecretSettingKey || undefined : undefined,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to save connector.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Connector"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="connector-form" loading={submitting}>Save</Button>
        </>
      }
    >
      <form id="connector-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}
        <div className="grid grid-cols-2 gap-4">
          <Input id="c-key" label="Key" placeholder="slack" value={form.key} required
            className="font-mono lowercase" onChange={(e) => field('key', e.target.value.toLowerCase())} />
          <Input id="c-name" label="Name" placeholder="Slack" value={form.name} required
            onChange={(e) => field('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input id="c-category" label="Category" placeholder="messaging" value={form.category}
            onChange={(e) => field('category', e.target.value)} />
          <Select id="c-auth" label="Auth Type" value={form.authType}
            onChange={(e) => field('authType', e.target.value as ConnectorAuthType)}
            options={[
              { value: 'API_KEY', label: 'API Key' },
              { value: 'OAUTH2', label: 'OAuth 2.0' },
              { value: 'WEBHOOK_ONLY', label: 'Webhook only' },
            ]} />
        </div>
        <Input id="c-icon" label="Icon URL" placeholder="optional" value={form.iconUrl}
          onChange={(e) => field('iconUrl', e.target.value)} />

        {form.authType === 'OAUTH2' && (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-text-secondary">OAuth 2.0 configuration</p>
            <Input id="c-auth-url" label="Authorize URL" placeholder="https://provider.com/oauth/authorize"
              value={form.oauthAuthUrl} onChange={(e) => field('oauthAuthUrl', e.target.value)} />
            <Input id="c-token-url" label="Token URL" placeholder="https://provider.com/oauth/token"
              value={form.oauthTokenUrl} onChange={(e) => field('oauthTokenUrl', e.target.value)} />
            <Input id="c-scopes" label="Scopes (comma-separated)" placeholder="read,write"
              value={form.oauthScopes} onChange={(e) => field('oauthScopes', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input id="c-client-id" label="Client ID Setting Key" placeholder="slack_client_id"
                value={form.clientIdSettingKey} onChange={(e) => field('clientIdSettingKey', e.target.value)} />
              <Input id="c-client-secret" label="Client Secret Setting Key" placeholder="slack_client_secret"
                value={form.clientSecretSettingKey} onChange={(e) => field('clientSecretSettingKey', e.target.value)} />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
