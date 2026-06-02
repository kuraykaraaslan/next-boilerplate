'use client';
import { use, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faTrash, faCopy, faCheck, faGear } from '@fortawesome/free-solid-svg-icons';
import { API_KEY_SCOPES, type ApiKeyScope } from '@/modules/api_key/api_key.enums';
import type { SafeApiKey as CanonicalSafeApiKey } from '@/modules/api_key/api_key.types';

type SafeApiKey = Omit<CanonicalSafeApiKey, 'lastUsedAt' | 'expiresAt' | 'createdAt' | 'updatedAt'> & {
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const PAGE_SIZE = 25;

const SCOPE_LABEL: Record<ApiKeyScope, string> = {
  read:  'Read',
  write: 'Write',
  admin: 'Admin',
  'scim:read':  'SCIM Read',
  'scim:write': 'SCIM Write',
};

const SCOPE_BADGE: Record<ApiKeyScope, 'primary' | 'warning' | 'error'> = {
  read:  'primary',
  write: 'warning',
  admin: 'error',
  'scim:read':  'primary',
  'scim:write': 'warning',
};

function formatDate(val: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function ApiKeysPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [keys, setKeys]     = useState<SafeApiKey[]>([]);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createScopes, setCreateScopes] = useState<ApiKeyScope[]>(['read']);
  const [createExpiry, setCreateExpiry] = useState('');
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState('');

  const [revealKey, setRevealKey] = useState('');
  const [copied, setCopied]       = useState(false);

  const [confirmRevoke, setConfirmRevoke] = useState<SafeApiKey | null>(null);
  const [revoking, setRevoking]           = useState(false);
  const [revokeError, setRevokeError]     = useState('');

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/api-keys`)
      .then((res) => setKeys(res.data.keys ?? []))
      .catch((err) => setFetchError(extractMessage(err, 'Failed to load API keys.')))
      .finally(() => setLoading(false));
  }, [tenantId]);

  function toggleScope(scope: ApiKeyScope) {
    setCreateScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  function resetCreate() {
    setCreateName('');
    setCreateDescription('');
    setCreateScopes(['read']);
    setCreateExpiry('');
    setCreateError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    if (createScopes.length === 0) {
      setCreateError('Select at least one scope.');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const payload: Record<string, unknown> = {
        name:   createName.trim(),
        scopes: createScopes,
      };
      if (createDescription.trim()) payload.description = createDescription.trim();
      if (createExpiry) payload.expiresAt = new Date(createExpiry).toISOString();

      const res = await api.post(`/tenant/${tenantId}/api/api-keys`, payload);
      setKeys((prev) => [res.data.key, ...prev]);
      setRevealKey(res.data.rawKey);
      setShowCreate(false);
      resetCreate();
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create key.'));
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(key: SafeApiKey) {
    try {
      const res = await api.put(`/tenant/${tenantId}/api/api-keys/${key.apiKeyId}`, {
        isActive: !key.isActive,
      });
      setKeys((prev) => prev.map((k) => (k.apiKeyId === key.apiKeyId ? res.data.key : k)));
      toast.success(key.isActive ? 'Key deactivated.' : 'Key activated.');
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to update key.'));
    }
  }

  async function handleRevoke() {
    if (!confirmRevoke) return;
    setRevoking(true);
    setRevokeError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/api-keys/${confirmRevoke.apiKeyId}`);
      setKeys((prev) => prev.filter((k) => k.apiKeyId !== confirmRevoke.apiKeyId));
      setConfirmRevoke(null);
      toast.success('Key revoked.');
    } catch (err: unknown) {
      setRevokeError(extractMessage(err, 'Failed to revoke key.'));
    } finally {
      setRevoking(false);
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const total = keys.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = keys.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<SafeApiKey>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (k) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{k.name}</p>
          {k.description && (
            <p className="text-xs text-text-secondary mt-0.5 truncate max-w-xs">{k.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'keyPrefix',
      header: 'Key',
      render: (k) => (
        <code className="text-xs font-mono bg-surface-overlay px-2 py-1 rounded text-text-secondary">
          {k.keyPrefix}…
        </code>
      ),
    },
    {
      key: 'scopes',
      header: 'Scopes',
      render: (k) => (
        <div className="flex flex-wrap gap-1">
          {k.scopes.map((s) => (
            <Badge key={s} variant={SCOPE_BADGE[s]} size="sm">{SCOPE_LABEL[s]}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'lastUsedAt',
      header: 'Last used',
      render: (k) => <span className="text-text-secondary text-xs">{formatDate(k.lastUsedAt)}</span>,
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (k) => <span className="text-text-secondary text-xs">{formatDate(k.expiresAt)}</span>,
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (k) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle
            id={`toggle-${k.apiKeyId}`}
            label=""
            checked={k.isActive}
            onChange={() => handleToggleActive(k)}
          />
        </div>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (k) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: 'Revoke',
                icon: <FontAwesomeIcon icon={faTrash} />,
                onClick: () => { setConfirmRevoke(k); setRevokeError(''); },
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Programmatic access tokens for your integrations"
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/api-keys/settings`, variant: 'ghost' as const },
          { label: 'New API Key', onClick: () => setShowCreate(true) },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(k) => k.apiKeyId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No API keys yet."
      />

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetCreate(); }}
        title="New API Key"
        description="API keys grant programmatic access. Copy the key immediately after creation — it will not be shown again."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowCreate(false); resetCreate(); }} disabled={creating}>
              Cancel
            </Button>
            <Button form="create-key-form" type="submit" loading={creating} iconLeft={<FontAwesomeIcon icon={faKey} />}>
              Create Key
            </Button>
          </>
        }
      >
        <form id="create-key-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}

          <Input
            id="key-name"
            label="Name"
            required
            placeholder="e.g. Production webhook"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />

          <Input
            id="key-description"
            label="Description (optional)"
            placeholder="What is this key used for?"
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary">Scopes</span>
            <div className="flex gap-4">
              {API_KEY_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-1.5 cursor-pointer text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={createScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-border accent-primary"
                  />
                  {SCOPE_LABEL[scope]}
                </label>
              ))}
            </div>
          </div>

          <Input
            id="key-expiry"
            label="Expiry date (optional)"
            type="date"
            value={createExpiry}
            onChange={(e) => setCreateExpiry(e.target.value)}
          />
        </form>
      </Modal>

      <Modal
        open={!!revealKey}
        onClose={() => { setRevealKey(''); setCopied(false); }}
        title="Copy your API key"
        description="This key will only be shown once. Store it somewhere safe."
        footer={
          <Button onClick={() => { setRevealKey(''); setCopied(false); }}>Done</Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-overlay p-3">
            <code className="flex-1 text-xs font-mono break-all text-text-primary select-all">
              {revealKey}
            </code>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Copy API key"
              onClick={() => copyToClipboard(revealKey)}
              iconLeft={
                <FontAwesomeIcon
                  icon={copied ? faCheck : faCopy}
                  className={copied ? 'text-success' : undefined}
                />
              }
            />
          </div>
          {copied && (
            <p className="text-xs text-success text-center">Copied to clipboard!</p>
          )}
          <AlertBanner
            variant="warning"
            message="You won't be able to see this key again. Make sure to copy it now."
          />
        </div>
      </Modal>

      <Modal
        open={confirmRevoke !== null}
        onClose={() => { setConfirmRevoke(null); setRevokeError(''); }}
        title="Revoke API Key"
        description={`Permanently revoke "${confirmRevoke?.name}"?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setConfirmRevoke(null); setRevokeError(''); }} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="danger" loading={revoking} onClick={handleRevoke}>Revoke Key</Button>
          </>
        }
      >
        {revokeError && <AlertBanner variant="error" message={revokeError} />}
        <p className="text-sm text-text-secondary">
          Any integrations using this key will immediately stop working. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
