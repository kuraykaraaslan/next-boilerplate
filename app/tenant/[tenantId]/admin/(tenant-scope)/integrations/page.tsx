'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/modules_next/common/ui/Button';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { EmptyState } from '@/modules_next/common/ui/EmptyState';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlug } from '@fortawesome/free-solid-svg-icons';
import { ConnectorFormModal } from '@/modules_next/integrations_hub/ui/ConnectorFormModal';
import type { Connector } from '@/modules/integrations_hub/integrations_hub.types';

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function IntegrationsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [connecting, setConnecting] = useState<Connector | null>(null);
  const [busy, setBusy] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const fetchConnectors = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/integrations/connectors`);
      setConnectors(res.data.connectors ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load connectors.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchConnectors(); }, [fetchConnectors]);

  async function handleCreate(payload: Record<string, unknown>) {
    await api.post(`/tenant/${tenantId}/api/integrations/connectors`, payload);
    toast.success('Connector saved.');
    fetchConnectors();
  }

  async function handleConnect(connector: Connector) {
    setBusy(true); setConnectError('');
    try {
      if (connector.authType === 'OAUTH2') {
        const redirectUri = `${window.location.origin}/tenant/${tenantId}/api/integrations/oauth/callback`;
        const res = await api.post(`/tenant/${tenantId}/api/integrations/oauth/start`, {
          connectorKey: connector.key, redirectUri,
        });
        window.location.href = res.data.authorizeUrl;
        return;
      }
      const res = await api.post(`/tenant/${tenantId}/api/integrations/connect/api-key`, {
        connectorKey: connector.key,
      });
      setConnecting(null);
      setRevealedKey(res.data.rawKey);
      toast.success('Connected.');
      fetchConnectors();
    } catch (err: unknown) {
      setConnectError(extractMessage(err, 'Failed to connect.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Connect third-party apps. Outbound triggers ride your webhooks; inbound actions use scoped API keys."
        actions={[
          { label: 'Connected Apps', variant: 'outline', onClick: () => router.push(`/tenant/${tenantId}/admin/integrations/connected`) },
          { label: 'New Connector', onClick: () => setFormOpen(true) },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      {loading ? (
        <div className="text-text-secondary">Loading…</div>
      ) : connectors.length === 0 ? (
        <EmptyState
          icon={<FontAwesomeIcon icon={faPlug} />}
          title="No connectors yet"
          description="Register a connector to let your tenant connect a third-party app."
          action={<Button onClick={() => setFormOpen(true)}>New Connector</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connectors.map((c) => (
            <div key={c.connectorId} className="flex flex-col rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                  <FontAwesomeIcon icon={faPlug} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary truncate">{c.name}</p>
                  <p className="text-xs text-text-secondary">{c.category}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="neutral">{c.authType.replace('_', ' ')}</Badge>
                {!c.isEnabled && <Badge variant="warning">Disabled</Badge>}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" disabled={!c.isEnabled} onClick={() => { setConnectError(''); setConnecting(c); }}>
                  Connect
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConnectorFormModal open={formOpen} onClose={() => setFormOpen(false)} onSave={handleCreate} />

      <Modal
        open={!!connecting}
        onClose={() => { setConnecting(null); setConnectError(''); }}
        title={`Connect ${connecting?.name ?? ''}`}
        description={connecting?.authType === 'OAUTH2'
          ? 'You will be redirected to the provider to authorize access.'
          : 'A scoped API key will be generated for this integration. Copy it — it is shown only once.'}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setConnecting(null); setConnectError(''); }} disabled={busy}>Cancel</Button>
            <Button onClick={() => connecting && handleConnect(connecting)} loading={busy}>Connect</Button>
          </>
        }
      >
        {connectError && <AlertBanner variant="error" message={connectError} />}
      </Modal>

      <Modal
        open={!!revealedKey}
        onClose={() => setRevealedKey(null)}
        title="Integration API Key"
        description="Copy this key now — it cannot be retrieved again."
        footer={<Button onClick={() => setRevealedKey(null)}>Done</Button>}
      >
        {revealedKey && (
          <p className="font-mono text-sm break-all rounded-md bg-surface-subtle px-3 py-2">{revealedKey}</p>
        )}
      </Modal>
    </div>
  );
}
