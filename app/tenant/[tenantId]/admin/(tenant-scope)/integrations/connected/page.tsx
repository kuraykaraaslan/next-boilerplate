'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@/modules_next/common/ui/Button';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable } from '@/modules_next/common/ui/ServerDataTable';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';
import { buildConnectedAppColumns, type ConnectedAppRow } from '@/modules_next/integrations_hub/ui/connected-apps-columns';

const PAGE_SIZE = 25;

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function ConnectedAppsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [apps, setApps] = useState<ConnectedAppRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [banner, setBanner] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const [disconnecting, setDisconnecting] = useState<ConnectedAppRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [disconnectError, setDisconnectError] = useState('');

  const fetchApps = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/integrations/connected?pageSize=100`);
      setApps(res.data.connectedApps ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load connected apps.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Surface OAuth callback result from the redirect query string.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('connected')) setBanner({ variant: 'success', message: 'Integration connected.' });
    else if (sp.get('error')) setBanner({ variant: 'error', message: `Connection failed: ${decodeURIComponent(sp.get('error') || '')}` });
  }, []);

  async function handleDisconnect() {
    if (!disconnecting) return;
    setBusy(true); setDisconnectError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/integrations/connected/${disconnecting.connectedAppId}`);
      setDisconnecting(null);
      toast.success('Disconnected.');
      fetchApps();
    } catch (err: unknown) {
      setDisconnectError(extractMessage(err, 'Failed to disconnect.'));
    } finally {
      setBusy(false);
    }
  }

  const total = apps.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = apps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildConnectedAppColumns({
    onDisconnect: (a) => { setDisconnectError(''); setDisconnecting(a); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Connected Apps" subtitle="Live third-party connections for this tenant." />

      {banner && <AlertBanner variant={banner.variant} message={banner.message} />}
      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(a) => a.connectedAppId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No connected apps yet."
      />

      <Modal
        open={!!disconnecting}
        onClose={() => { setDisconnecting(null); setDisconnectError(''); }}
        title="Disconnect Integration"
        description="This revokes the integration's API key and removes stored tokens."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDisconnecting(null); setDisconnectError(''); }} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={handleDisconnect} loading={busy}>Disconnect</Button>
          </>
        }
      >
        {disconnectError && <AlertBanner variant="error" message={disconnectError} />}
      </Modal>
    </div>
  );
}
