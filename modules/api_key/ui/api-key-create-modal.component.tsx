'use client';

import { useState } from 'react';
import api from '@nb/common/server/axios';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { Modal } from '@nb/common/ui/modal.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import { API_KEY_SCOPES, type ApiKeyScope } from '@nb/api_key/server/api_key.enums';
import type { SafeApiKey } from './api-key-columns.component';

const SCOPE_LABEL: Record<ApiKeyScope, string> = {
  read: 'Read', write: 'Write', admin: 'Admin', 'scim:read': 'SCIM Read', 'scim:write': 'SCIM Write',
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onCreated: (key: SafeApiKey, rawKey: string) => void;
};

export function ApiKeyCreateModal({ open, tenantId, onClose, onCreated }: Props) {
  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [scopes, setScopes]         = useState<ApiKeyScope[]>(['read']);
  const [expiry, setExpiry]         = useState('');
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState('');

  function reset() { setName(''); setDescription(''); setScopes(['read']); setExpiry(''); setCreateError(''); }
  function handleClose() { reset(); onClose(); }

  function toggleScope(scope: ApiKeyScope) {
    setScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (scopes.length === 0) { setCreateError('Select at least one scope.'); return; }
    setCreating(true); setCreateError('');
    try {
      const payload: Record<string, unknown> = { name: name.trim(), scopes };
      if (description.trim()) payload.description = description.trim();
      if (expiry) payload.expiresAt = new Date(expiry).toISOString();
      const res = await api.post(`/tenant/${tenantId}/api/api-keys`, payload);
      handleClose();
      onCreated(res.data.key, res.data.rawKey);
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create key.'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New API Key"
      description="API keys grant programmatic access. Copy the key immediately after creation — it will not be shown again."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={creating}>Cancel</Button>
          <Button form="create-key-form" type="submit" loading={creating} iconLeft={<FontAwesomeIcon icon={faKey} />}>
            Create Key
          </Button>
        </>
      }
    >
      <form id="create-key-form" onSubmit={handleSubmit} className="space-y-4">
        {createError && <AlertBanner variant="error" message={createError} />}
        <Input id="key-name" label="Name" required placeholder="e.g. Production webhook" value={name} onChange={(e) => setName(e.target.value)} />
        <Input id="key-description" label="Description (optional)" placeholder="What is this key used for?" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-primary">Scopes</span>
          <div className="flex gap-4">
            {API_KEY_SCOPES.map((scope) => (
              <label key={scope} className="flex items-center gap-1.5 cursor-pointer text-sm text-text-primary">
                <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} className="rounded border-border accent-primary" />
                {SCOPE_LABEL[scope]}
              </label>
            ))}
          </div>
        </div>
        <Input id="key-expiry" label="Expiry date (optional)" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
      </form>
    </Modal>
  );
}
