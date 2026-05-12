'use client';
import { use, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { EmptyState } from '@/modules_next/common/ui/EmptyState';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faKey,
  faPlus,
  faTrash,
  faCopy,
  faCheck,
  faToggleOn,
  faToggleOff,
} from '@fortawesome/free-solid-svg-icons';
import { API_KEY_SCOPES, type ApiKeyScope } from '@/modules/api_key/api_key.enums';

type SafeApiKey = {
  apiKeyId: string;
  tenantId: string;
  createdByUserId: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const SCOPE_LABEL: Record<ApiKeyScope, string> = {
  read:  'Read',
  write: 'Write',
  admin: 'Admin',
};

const SCOPE_BADGE: Record<ApiKeyScope, 'primary' | 'warning' | 'error'> = {
  read:  'primary',
  write: 'warning',
  admin: 'error',
};

function formatDate(val: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ApiKeysPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [keys, setKeys] = useState<SafeApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createScopes, setCreateScopes] = useState<ApiKeyScope[]>(['read']);
  const [createExpiry, setCreateExpiry] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Raw key reveal modal (shown once after creation)
  const [revealKey, setRevealKey] = useState('');
  const [copied, setCopied] = useState(false);

  // Revoke confirm
  const [confirmRevoke, setConfirmRevoke] = useState<SafeApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/api-keys`)
      .then((res) => setKeys(res.data.keys ?? []))
      .catch(() => setFetchError('Failed to load API keys. Please refresh.'))
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
        name: createName.trim(),
        scopes: createScopes,
      };
      if (createDescription.trim()) payload.description = createDescription.trim();
      if (createExpiry) payload.expiresAt = new Date(createExpiry).toISOString();

      const res = await api.post(`/tenant/${tenantId}/api/api-keys`, payload);
      setKeys((prev) => [res.data.key, ...prev]);
      setRevealKey(res.data.rawKey);
      setShowCreate(false);
      resetCreate();
    } catch (err: any) {
      setCreateError(err.response?.data?.message ?? err.message ?? 'Failed to create key.');
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
    } catch {
      // silent — no blocking action
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
    } catch (err: any) {
      setRevokeError(err.response?.data?.message ?? err.message ?? 'Failed to revoke key.');
    } finally {
      setRevoking(false);
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Programmatic access tokens for your integrations"
        actions={[{ label: 'New API Key', onClick: () => setShowCreate(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            icon={<FontAwesomeIcon icon={faKey} className="w-5 h-5" />}
            title="No API keys yet"
            description="Create an API key to authenticate programmatic requests."
            action={
              <Button onClick={() => setShowCreate(true)} iconLeft={<FontAwesomeIcon icon={faPlus} />}>
                New API Key
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Key</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Scopes</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Last used</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Expires</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((key) => (
                  <tr key={key.apiKeyId} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-primary">{key.name}</p>
                      {key.description && (
                        <p className="text-xs text-text-secondary mt-0.5 truncate max-w-[180px]">{key.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs font-mono bg-surface-overlay px-2 py-1 rounded text-text-secondary">
                        {key.keyPrefix}…
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <Badge key={s} variant={SCOPE_BADGE[s]} size="sm">
                            {SCOPE_LABEL[s]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-xs">{formatDate(key.lastUsedAt)}</td>
                    <td className="px-6 py-4 text-text-secondary text-xs">{formatDate(key.expiresAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(key)}
                        aria-label={key.isActive ? 'Deactivate key' : 'Activate key'}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <FontAwesomeIcon
                          icon={key.isActive ? faToggleOn : faToggleOff}
                          className={`w-5 h-5 ${key.isActive ? 'text-success' : 'text-text-secondary'}`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label="Revoke key"
                        onClick={() => setConfirmRevoke(key)}
                        iconLeft={<FontAwesomeIcon icon={faTrash} className="text-error" />}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Modal */}
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
            <span className="text-xs font-medium text-text-secondary">Scopes</span>
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

      {/* Raw Key Reveal Modal — shown once after creation */}
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

      {/* Revoke Confirm Modal */}
      <Modal
        open={confirmRevoke !== null}
        onClose={() => { setConfirmRevoke(null); setRevokeError(''); }}
        title="Revoke API Key"
        description={`Permanently revoke "${confirmRevoke?.name}"?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRevoke(null)} disabled={revoking}>Cancel</Button>
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
