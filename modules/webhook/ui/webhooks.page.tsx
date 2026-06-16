'use client';
import { use, useEffect, useState, useCallback } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { Button } from '@nb/common/ui/button.component';
import { Modal } from '@nb/common/ui/modal.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { ServerDataTable } from '@nb/common/ui/server-data-table.component';
import { toast } from '@nb/common/ui/toast.store';
import { isRootTenant } from '@nb/tenant/server/tenant.constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import type { WebhookEvent } from '@nb/webhook/server/webhook.enums';
import type { WebhookMetrics } from '@nb/webhook/server/webhook.types';
import { groupedCatalogForScope, scopeForTenant } from '@nb/webhook/server/webhook.catalog';

import { type Webhook, type Delivery, extractMessage } from '@nb/webhook/ui/webhook.types';
import { WebhookFormModal } from '@nb/webhook/ui/webhook-form-modal.component';
import { WebhookTriggerModal } from '@nb/webhook/ui/webhook-trigger-modal.component';
import { WebhookDeliveryModal } from '@nb/webhook/ui/webhook-delivery-modal.component';
import { buildWebhookColumns } from '@nb/webhook/ui/webhook-columns.component';

const PAGE_SIZE = 20;

export default function WebhooksPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const isRoot = isRootTenant(tenantId);
  const apiBase = `/tenant/${tenantId}/api/webhooks`;
  const eventGroups = groupedCatalogForScope(scopeForTenant(isRoot));

  const [webhooks, setWebhooks]     = useState<Webhook[]>([]);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [metrics, setMetrics]       = useState<WebhookMetrics | null>(null);

  const [formOpen, setFormOpen]           = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Webhook | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  const [deliveriesWebhook, setDeliveriesWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries]               = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const [testing, setTesting]           = useState<string | null>(null);
  const [redelivering, setRedelivering] = useState<string | null>(null);
  const [triggerWebhook, setTriggerWebhook] = useState<Webhook | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`${apiBase}?pageSize=100`);
      setWebhooks(res.data.webhooks ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load webhooks.'));
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await api.get(`${apiBase}/metrics?days=7`);
      setMetrics(res.data.metrics ?? null);
    } catch { setMetrics(null); }
  }, [apiBase]);

  useEffect(() => { fetchWebhooks(); fetchMetrics(); }, [fetchWebhooks, fetchMetrics]);

  const fetchDeliveries = useCallback(async (webhookId: string) => {
    setDeliveriesLoading(true);
    try {
      const res = await api.get(`${apiBase}/${webhookId}/deliveries?pageSize=20`);
      setDeliveries(res.data.deliveries ?? []);
    } catch { setDeliveries([]); } finally { setDeliveriesLoading(false); }
  }, [apiBase]);

  const handleSave = useCallback(async (payload: Record<string, unknown>) => {
    if (editingWebhook) {
      await api.patch(`${apiBase}/${editingWebhook.webhookId}`, payload);
      toast.success('Webhook updated.');
    } else {
      await api.post(apiBase, payload);
      toast.success('Webhook created.');
    }
    fetchWebhooks();
  }, [apiBase, editingWebhook, fetchWebhooks]);

  async function handleToggleActive(webhook: Webhook) {
    try {
      await api.patch(`${apiBase}/${webhook.webhookId}`, { isActive: !webhook.isActive });
      const nowActive = !webhook.isActive;
      setWebhooks((prev) => prev.map((w) => w.webhookId === webhook.webhookId
        ? { ...w, isActive: nowActive, autoDisabledAt: nowActive ? null : w.autoDisabledAt, consecutiveFailures: nowActive ? 0 : w.consecutiveFailures }
        : w));
      toast.success(webhook.isActive ? 'Webhook disabled.' : 'Webhook enabled.');
    } catch (err: unknown) { toast.error(extractMessage(err, 'Failed to update webhook.')); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(`${apiBase}/${confirmDelete.webhookId}`);
      setWebhooks((prev) => prev.filter((w) => w.webhookId !== confirmDelete.webhookId));
      setConfirmDelete(null);
      toast.success('Webhook deleted.');
    } catch (err: unknown) {
      setDeleteError(extractMessage(err, 'Failed to delete webhook.'));
    } finally { setDeleting(false); }
  }

  async function handleTest(webhookId: string) {
    setTesting(webhookId);
    try {
      const res = await api.post(`${apiBase}/${webhookId}/test`);
      const d: Delivery = res.data.delivery;
      if (d.status === 'SUCCESS') toast.success(`Test delivered — HTTP ${d.responseStatus} in ${d.duration}ms`);
      else toast.error(`Test failed — ${d.errorMessage ?? `HTTP ${d.responseStatus}`}`);
      if (deliveriesWebhook?.webhookId === webhookId) fetchDeliveries(webhookId);
    } catch (err: unknown) { toast.error(extractMessage(err, 'Test request failed.')); }
    finally { setTesting(null); }
  }

  async function handleTrigger(webhookId: string, event: WebhookEvent, payload: unknown) {
    await api.post(`${apiBase}/${webhookId}/trigger`, { event, payload });
    toast.success(`Triggered ${event}.`);
    setTriggerWebhook(null);
    if (deliveriesWebhook?.webhookId === webhookId) fetchDeliveries(webhookId);
  }

  async function handleRedeliver(webhookId: string, deliveryId: string) {
    setRedelivering(deliveryId);
    try {
      await api.post(`${apiBase}/${webhookId}/deliveries/${deliveryId}/redeliver`);
      toast.success('Redelivery queued.');
      fetchDeliveries(webhookId);
    } catch (err: unknown) { toast.error(extractMessage(err, 'Failed to redeliver.')); }
    finally { setRedelivering(null); }
  }

  async function handleRotateSecret(webhookId: string) {
    if (!confirm('Rotate the signing secret for this webhook?\n\nThe previous secret stays valid for 48 hours so subscribers can swap. The new secret is shown only once — copy it immediately.')) return;
    try {
      const res = await api.post(`${apiBase}/${webhookId}/rotate-secret`, { overlapHours: 48 });
      const newSecret = res.data?.newSecret as string;
      if (newSecret) window.prompt('New webhook signing secret (shown once — copy it now):', newSecret);
      toast.success('Webhook secret rotated. Previous secret valid for 48h.');
    } catch (err: unknown) { toast.error(extractMessage(err, 'Failed to rotate secret.')); }
  }

  async function handleReplayDeadLetter(webhookId: string) {
    if (!confirm('Re-queue every dead-lettered delivery for this webhook?')) return;
    try {
      const res = await api.post(`${apiBase}/${webhookId}/deliveries/replay-dead-letter`);
      const n = res.data?.replayed ?? 0;
      toast.success(`${n} dead-lettered ${n === 1 ? 'delivery' : 'deliveries'} re-queued.`);
      fetchDeliveries(webhookId);
    } catch (err: unknown) { toast.error(extractMessage(err, 'Failed to replay dead-lettered deliveries.')); }
  }

  const total = webhooks.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = webhooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildWebhookColumns({
    testing,
    onToggleActive: handleToggleActive,
    onEdit: (w) => { setEditingWebhook(w); setFormOpen(true); },
    onTest: handleTest,
    onTrigger: setTriggerWebhook,
    onDeliveries: (w) => { setDeliveriesWebhook(w); fetchDeliveries(w.webhookId); },
    onRotateSecret: handleRotateSecret,
    onDelete: (w) => { setDeleteError(''); setConfirmDelete(w); },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRoot ? 'Platform Webhooks' : 'Webhooks'}
        subtitle={isRoot
          ? 'Send real-time HTTP notifications for platform-wide events.'
          : 'Receive real-time HTTP notifications when events occur in your tenant.'}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/webhooks/settings`, variant: 'ghost' as const },
          { label: 'New Webhook', onClick: () => { setEditingWebhook(null); setFormOpen(true); } },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      {metrics && metrics.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Deliveries (7d)', value: String(metrics.total) },
            { label: 'Success rate', value: metrics.successRate != null ? `${Math.round(metrics.successRate * 100)}%` : '—' },
            { label: 'Avg latency', value: metrics.avgDurationMs != null ? `${metrics.avgDurationMs} ms` : '—' },
            { label: 'p95 latency', value: metrics.p95DurationMs != null ? `${metrics.p95DurationMs} ms` : '—' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-surface-base px-4 py-3">
              <p className="text-xs text-text-secondary">{stat.label}</p>
              <p className="text-xl font-semibold text-text-primary mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(w) => w.webhookId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No webhooks yet."
      />

      <WebhookFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={editingWebhook}
        isRoot={isRoot}
        eventGroups={eventGroups}
        onSave={handleSave}
      />

      <WebhookTriggerModal
        webhook={triggerWebhook}
        onClose={() => setTriggerWebhook(null)}
        onTrigger={handleTrigger}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => { setConfirmDelete(null); setDeleteError(''); }}
        title={isRoot ? 'Delete Platform Webhook' : 'Delete Webhook'}
        description={`Delete ${confirmDelete?.name}? All delivery history will also be removed.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setConfirmDelete(null); setDeleteError(''); }} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
      </Modal>

      <WebhookDeliveryModal
        webhook={deliveriesWebhook}
        deliveries={deliveries}
        loading={deliveriesLoading}
        onClose={() => setDeliveriesWebhook(null)}
        onRedeliver={handleRedeliver}
        redelivering={redelivering}
        onReplayDeadLetter={handleReplayDeadLetter}
      />
    </div>
  );
}
