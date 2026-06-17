'use client';
import { use, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { ServerDataTable } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faGear } from '@fortawesome/free-solid-svg-icons';
import { buildApiKeyColumns, type SafeApiKey } from '@kuraykaraaslan/api_key/ui/api-key-columns.component';
import { ApiKeyCreateModal } from '@kuraykaraaslan/api_key/ui/api-key-create-modal.component';

const PAGE_SIZE = 25;

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

  async function handleToggleActive(key: SafeApiKey) {
    try {
      const res = await api.put(`/tenant/${tenantId}/api/api-keys/${key.apiKeyId}`, { isActive: !key.isActive });
      setKeys((prev) => prev.map((k) => (k.apiKeyId === key.apiKeyId ? res.data.key : k)));
      toast.success(key.isActive ? 'Key deactivated.' : 'Key activated.');
    } catch (err: unknown) { toast.error(extractMessage(err, 'Failed to update key.')); }
  }

  async function handleRevoke() {
    if (!confirmRevoke) return;
    setRevoking(true); setRevokeError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/api-keys/${confirmRevoke.apiKeyId}`);
      setKeys((prev) => prev.filter((k) => k.apiKeyId !== confirmRevoke.apiKeyId));
      setConfirmRevoke(null); toast.success('Key revoked.');
    } catch (err: unknown) { setRevokeError(extractMessage(err, 'Failed to revoke key.')); }
    finally { setRevoking(false); }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const total = keys.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const columns = buildApiKeyColumns({
    onToggleActive: handleToggleActive,
    onRevoke: (k) => { setConfirmRevoke(k); setRevokeError(''); },
  });

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
        rows={keys.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
        getRowKey={(k) => k.apiKeyId}
        page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage} loading={loading} emptyMessage="No API keys yet."
      />

      <ApiKeyCreateModal
        open={showCreate}
        tenantId={tenantId}
        onClose={() => setShowCreate(false)}
        onCreated={(key, rawKey) => { setKeys((prev) => [key, ...prev]); setRevealKey(rawKey); }}
      />

      <Modal open={!!revealKey} onClose={() => { setRevealKey(''); setCopied(false); }}
        title="Copy your API key" description="This key will only be shown once. Store it somewhere safe."
        footer={<Button onClick={() => { setRevealKey(''); setCopied(false); }}>Done</Button>}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-overlay p-3">
            <code className="flex-1 text-xs font-mono break-all text-text-primary select-all">{revealKey}</code>
            <Button variant="ghost" size="sm" iconOnly aria-label="Copy API key" onClick={() => copyToClipboard(revealKey)}
              iconLeft={<FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-success' : undefined} />}
            />
          </div>
          {copied && <p className="text-xs text-success text-center">Copied to clipboard!</p>}
          <AlertBanner variant="warning" message="You won't be able to see this key again. Make sure to copy it now." />
        </div>
      </Modal>

      <Modal open={confirmRevoke !== null} onClose={() => { setConfirmRevoke(null); setRevokeError(''); }}
        title="Revoke API Key" description={`Permanently revoke "${confirmRevoke?.name}"?`}
        footer={<>
          <Button variant="ghost" onClick={() => { setConfirmRevoke(null); setRevokeError(''); }} disabled={revoking}>Cancel</Button>
          <Button variant="danger" loading={revoking} onClick={handleRevoke}>Revoke Key</Button>
        </>}
      >
        {revokeError && <AlertBanner variant="error" message={revokeError} />}
        <p className="text-sm text-text-secondary">Any integrations using this key will immediately stop working. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
