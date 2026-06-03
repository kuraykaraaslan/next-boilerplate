'use client';
import { use, useEffect, useState, useCallback } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faFlask,
  faRotateRight,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faListUl,
  faKey,
  faGear,
  faPen,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';

import type { WebhookEvent } from '@/modules/webhook/webhook.enums';
import type { WebhookMetrics } from '@/modules/webhook/webhook.types';
import { groupedCatalogForScope, scopeForTenant } from '@/modules/webhook/webhook.catalog';

type Webhook = {
  webhookId: string;
  name: string;
  description: string | null;
  url: string;
  events: WebhookEvent[];
  headers: Record<string, string> | null;
  eventFilters: Record<string, Record<string, unknown>> | null;
  tags: string[] | null;
  rateLimitPerMinute: number | null;
  isActive: boolean;
  consecutiveFailures: number;
  autoDisabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Delivery = {
  deliveryId: string;
  event: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'DEAD_LETTERED';
  attempts: number;
  maxAttempts: number;
  responseStatus: number | null;
  errorMessage: string | null;
  duration: number | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

const statusVariant = (s: Delivery['status']): 'success' | 'error' | 'warning' =>
  s === 'SUCCESS' ? 'success' : s === 'FAILED' || s === 'DEAD_LETTERED' ? 'error' : 'warning';

const statusIcon = (s: Delivery['status']) =>
  s === 'SUCCESS' ? faCircleCheck : s === 'FAILED' || s === 'DEAD_LETTERED' ? faCircleXmark : faClock;

const STATUS_LABEL: Record<Delivery['status'], string> = {
  PENDING: 'Pending',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  DEAD_LETTERED: 'Dead-lettered',
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function WebhooksPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  // Root tenant: Webhook rows tagged with ROOT_TENANT_ID via the
  // platform-admin route (admin-only auth, platform-wide event catalog).
  // Non-root tenant: Webhook rows tagged with the local tenantId via the
  // regular tenant route (tenant ADMIN auth, tenant-scoped event catalog).
  const isRoot = isRootTenant(tenantId);
  const apiBase = isRoot
    ? `/tenant/${tenantId}/api/webhooks`
    : `/tenant/${tenantId}/api/webhooks`;
  // Event picker is driven by the shared webhook catalog (single source of truth,
  // also served by GET /api/webhooks/events) — root tenant sees platform events.
  const eventGroups = groupedCatalogForScope(scopeForTenant(isRoot));

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [metrics, setMetrics]   = useState<WebhookMetrics | null>(null);

  // One form serves both "create" and "edit" — identical fields. In edit mode
  // `editingId` holds the webhook being patched; in create mode it stays null.
  const [formOpen, setFormOpen]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState({
    name: '',
    description: '',
    url: '',
    events: [] as WebhookEvent[],
    tagsText: '',
    headerRows: [] as { key: string; value: string }[],
    filtersText: '',
    rateLimitText: '',
  });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  const [confirmDelete, setConfirmDelete] = useState<Webhook | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  const [deliveriesWebhook, setDeliveriesWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries]               = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const [testing, setTesting]           = useState<string | null>(null);
  const [redelivering, setRedelivering] = useState<string | null>(null);

  const [triggerWebhook, setTriggerWebhook] = useState<Webhook | null>(null);
  const [triggerEvent, setTriggerEvent]     = useState<WebhookEvent | ''>('');
  const [triggerPayload, setTriggerPayload] = useState('{}');
  const [triggering, setTriggering]         = useState(false);
  const [triggerError, setTriggerError]     = useState('');

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setFetchError('');
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
    } catch {
      setMetrics(null);
    }
  }, [apiBase]);

  useEffect(() => { fetchWebhooks(); fetchMetrics(); }, [fetchWebhooks, fetchMetrics]);

  const fetchDeliveries = useCallback(async (webhookId: string) => {
    setDeliveriesLoading(true);
    try {
      const res = await api.get(`${apiBase}/${webhookId}/deliveries?pageSize=20`);
      setDeliveries(res.data.deliveries ?? []);
    } catch {
      setDeliveries([]);
    } finally {
      setDeliveriesLoading(false);
    }
  }, [apiBase]);

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', description: '', url: '', events: [], tagsText: '', headerRows: [], filtersText: '', rateLimitText: '' });
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(webhook: Webhook) {
    setEditingId(webhook.webhookId);
    setForm({
      name: webhook.name,
      description: webhook.description ?? '',
      url: webhook.url,
      events: webhook.events,
      tagsText: (webhook.tags ?? []).join(', '),
      headerRows: Object.entries(webhook.headers ?? {}).map(([key, value]) => ({ key, value })),
      filtersText: webhook.eventFilters ? JSON.stringify(webhook.eventFilters, null, 2) : '',
      rateLimitText: webhook.rateLimitPerMinute != null ? String(webhook.rateLimitPerMinute) : '',
    });
    setFormError('');
    setFormOpen(true);
  }

  function toggleEvent(event: WebhookEvent) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  function addHeaderRow() {
    setForm((prev) => ({ ...prev, headerRows: [...prev.headerRows, { key: '', value: '' }] }));
  }
  function updateHeaderRow(index: number, field: 'key' | 'value', value: string) {
    setForm((prev) => ({
      ...prev,
      headerRows: prev.headerRows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  }
  function removeHeaderRow(index: number) {
    setForm((prev) => ({ ...prev, headerRows: prev.headerRows.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    if (!form.url.trim())  { setFormError('URL is required.');  return; }
    if (form.events.length === 0) { setFormError('Select at least one event.'); return; }

    const tags = form.tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    const headers: Record<string, string> = {};
    for (const row of form.headerRows) {
      const key = row.key.trim();
      if (key) headers[key] = row.value;
    }
    let eventFilters: Record<string, unknown> | undefined;
    if (form.filtersText.trim()) {
      try {
        eventFilters = JSON.parse(form.filtersText);
      } catch {
        setFormError('Event filters must be valid JSON.');
        return;
      }
    }

    let rateLimitPerMinute: number | null = null;
    if (form.rateLimitText.trim()) {
      const n = parseInt(form.rateLimitText, 10);
      if (!Number.isFinite(n) || n < 1) {
        setFormError('Rate limit must be a positive whole number.');
        return;
      }
      rateLimitPerMinute = n;
    }

    // On create, omit empty optional fields; on edit, send null to clear them.
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      url: form.url,
      events: form.events,
    };
    if (editingId) {
      payload.tags = tags.length ? tags : null;
      payload.headers = Object.keys(headers).length ? headers : null;
      payload.eventFilters = eventFilters ?? null;
      payload.rateLimitPerMinute = rateLimitPerMinute;
    } else {
      if (tags.length) payload.tags = tags;
      if (Object.keys(headers).length) payload.headers = headers;
      if (eventFilters) payload.eventFilters = eventFilters;
      if (rateLimitPerMinute != null) payload.rateLimitPerMinute = rateLimitPerMinute;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`${apiBase}/${editingId}`, payload);
        toast.success('Webhook updated.');
      } else {
        await api.post(apiBase, payload);
        toast.success('Webhook created.');
      }
      setFormOpen(false);
      fetchWebhooks();
    } catch (err: unknown) {
      setFormError(extractMessage(err, editingId ? 'Failed to update webhook.' : 'Failed to create webhook.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(webhook: Webhook) {
    try {
      await api.patch(`${apiBase}/${webhook.webhookId}`, {
        isActive: !webhook.isActive,
      });
      const nowActive = !webhook.isActive;
      setWebhooks((prev) =>
        prev.map((w) => w.webhookId === webhook.webhookId
          // Re-enabling clears the circuit-breaker state server-side; mirror that locally.
          ? { ...w, isActive: nowActive, autoDisabledAt: nowActive ? null : w.autoDisabledAt, consecutiveFailures: nowActive ? 0 : w.consecutiveFailures }
          : w),
      );
      toast.success(webhook.isActive ? 'Webhook disabled.' : 'Webhook enabled.');
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to update webhook.'));
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`${apiBase}/${confirmDelete.webhookId}`);
      setWebhooks((prev) => prev.filter((w) => w.webhookId !== confirmDelete.webhookId));
      setConfirmDelete(null);
      toast.success('Webhook deleted.');
    } catch (err: unknown) {
      setDeleteError(extractMessage(err, 'Failed to delete webhook.'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleTest(webhookId: string) {
    setTesting(webhookId);
    try {
      const res = await api.post(`${apiBase}/${webhookId}/test`);
      const d: Delivery = res.data.delivery;
      if (d.status === 'SUCCESS') {
        toast.success(`Test delivered — HTTP ${d.responseStatus} in ${d.duration}ms`);
      } else {
        toast.error(`Test failed — ${d.errorMessage ?? `HTTP ${d.responseStatus}`}`);
      }
      if (deliveriesWebhook?.webhookId === webhookId) fetchDeliveries(webhookId);
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Test request failed.'));
    } finally {
      setTesting(null);
    }
  }

  function openTrigger(webhook: Webhook) {
    setTriggerWebhook(webhook);
    setTriggerEvent(webhook.events[0] ?? '');
    setTriggerPayload('{}');
    setTriggerError('');
  }

  async function handleTrigger() {
    if (!triggerWebhook || !triggerEvent) { setTriggerError('Pick an event.'); return; }
    let payload: unknown = {};
    if (triggerPayload.trim()) {
      try { payload = JSON.parse(triggerPayload); } catch { setTriggerError('Payload must be valid JSON.'); return; }
    }
    setTriggering(true);
    setTriggerError('');
    try {
      await api.post(`${apiBase}/${triggerWebhook.webhookId}/trigger`, { event: triggerEvent, payload });
      toast.success(`Triggered ${triggerEvent}.`);
      setTriggerWebhook(null);
      if (deliveriesWebhook?.webhookId === triggerWebhook.webhookId) fetchDeliveries(triggerWebhook.webhookId);
    } catch (err: unknown) {
      setTriggerError(extractMessage(err, 'Trigger failed.'));
    } finally {
      setTriggering(false);
    }
  }

  function openDeliveries(webhook: Webhook) {
    setDeliveriesWebhook(webhook);
    fetchDeliveries(webhook.webhookId);
  }

  async function handleRedeliver(webhookId: string, deliveryId: string) {
    setRedelivering(deliveryId);
    try {
      await api.post(`${apiBase}/${webhookId}/deliveries/${deliveryId}/redeliver`);
      toast.success('Redelivery queued.');
      fetchDeliveries(webhookId);
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to redeliver.'));
    } finally {
      setRedelivering(null);
    }
  }

  async function handleRotateSecret(webhookId: string) {
    if (!confirm(
      'Rotate the signing secret for this webhook?\n\n' +
      'The previous secret stays valid for 48 hours so subscribers can swap. '
      + 'The new secret is shown only once — copy it immediately.'
    )) return;
    try {
      const res = await api.post(`${apiBase}/${webhookId}/rotate-secret`, { overlapHours: 48 });
      const newSecret = res.data?.newSecret as string;
      if (newSecret) {
        // One-shot reveal via prompt() — clipboard write is unreliable in some
        // browsers without an explicit gesture; a modal would be nicer but the
        // prompt keeps this dependency-free and force-acknowledges the user.
        window.prompt(
          'New webhook signing secret (shown once — copy it now):',
          newSecret,
        );
      }
      toast.success('Webhook secret rotated. Previous secret valid for 48h.');
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to rotate secret.'));
    }
  }

  async function handleReplayDeadLetter(webhookId: string) {
    if (!confirm('Re-queue every dead-lettered delivery for this webhook?')) return;
    try {
      const res = await api.post(`${apiBase}/${webhookId}/deliveries/replay-dead-letter`);
      const n = res.data?.replayed ?? 0;
      toast.success(`${n} dead-lettered ${n === 1 ? 'delivery' : 'deliveries'} re-queued.`);
      fetchDeliveries(webhookId);
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to replay dead-lettered deliveries.'));
    }
  }

  const total = webhooks.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = webhooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<Webhook>[] = [
    {
      key: 'name',
      header: 'Webhook',
      render: (w) => (
        <div className="min-w-0">
          <p className="font-semibold text-text-primary truncate">{w.name}</p>
          <p className="text-xs text-text-secondary truncate max-w-md">{w.url}</p>
          {w.description && (
            <p className="text-xs text-text-secondary mt-0.5 truncate max-w-md">{w.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'events',
      header: 'Events',
      render: (w) => (
        <Badge variant="neutral">{w.events.length} event{w.events.length !== 1 ? 's' : ''}</Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (w) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          <Toggle
            id={`toggle-${w.webhookId}`}
            label=""
            checked={w.isActive}
            onChange={() => handleToggleActive(w)}
          />
          {!w.isActive && w.autoDisabledAt && (
            <span title={`Auto-disabled after ${w.consecutiveFailures} consecutive failures. Toggle on to re-enable.`}>
              <Badge variant="error">Auto-disabled</Badge>
            </span>
          )}
        </div>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (w) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: 'Edit',
                icon: <FontAwesomeIcon icon={faPen} />,
                onClick: () => openEdit(w),
              },
              {
                label: testing === w.webhookId ? 'Testing…' : 'Send test event',
                icon: <FontAwesomeIcon icon={faFlask} />,
                onClick: () => handleTest(w.webhookId),
              },
              {
                label: 'Trigger event…',
                icon: <FontAwesomeIcon icon={faBolt} />,
                onClick: () => openTrigger(w),
              },
              {
                label: 'View deliveries',
                icon: <FontAwesomeIcon icon={faListUl} />,
                onClick: () => openDeliveries(w),
              },
              {
                label: 'Rotate signing secret',
                icon: <FontAwesomeIcon icon={faKey} />,
                onClick: () => handleRotateSecret(w.webhookId),
              },
              {
                label: 'Delete',
                icon: <FontAwesomeIcon icon={faTrash} />,
                onClick: () => { setDeleteError(''); setConfirmDelete(w); },
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const deliveryColumns: TableColumn<Delivery>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={statusIcon(d.status)}
            className={
              d.status === 'SUCCESS' ? 'text-success'
              : d.status === 'FAILED' ? 'text-error'
              : 'text-warning'
            }
          />
          <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      render: (d) => <span className="font-mono text-xs text-text-primary">{d.event}</span>,
    },
    {
      key: 'responseStatus',
      header: 'HTTP',
      render: (d) => (
        <span className="text-xs text-text-secondary">{d.responseStatus != null ? d.responseStatus : '—'}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (d) => (
        <span className="text-xs text-text-secondary">{d.duration != null ? `${d.duration}ms` : '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'When',
      render: (d) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {new Date(d.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (d) =>
        (d.status === 'FAILED' || d.status === 'DEAD_LETTERED') && deliveriesWebhook ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRedeliver(deliveriesWebhook.webhookId, d.deliveryId)}
            disabled={redelivering === d.deliveryId}
            iconLeft={<FontAwesomeIcon icon={faRotateRight} />}
          >
            {redelivering === d.deliveryId
              ? 'Redelivering'
              : d.status === 'DEAD_LETTERED' ? 'Replay' : 'Redeliver'}
          </Button>
        ) : null,
    },
  ];

  // Count dead-lettered deliveries in the current view to show the bulk action.
  const deadLetterCount = deliveries.filter((d) => d.status === 'DEAD_LETTERED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRoot ? 'Platform Webhooks' : 'Webhooks'}
        subtitle={isRoot
          ? 'Send real-time HTTP notifications for platform-wide events.'
          : 'Receive real-time HTTP notifications when events occur in your tenant.'}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/webhooks/settings`, variant: 'ghost' as const },
          { label: 'New Webhook', onClick: openCreate },
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId
          ? (isRoot ? 'Edit Platform Webhook' : 'Edit Webhook')
          : (isRoot ? 'New Platform Webhook' : 'New Webhook')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editingId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}

          <Input
            id="webhook-name"
            label="Name"
            placeholder="My webhook"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Input
            id="webhook-url"
            label="URL"
            placeholder="https://your-service.com/webhook"
            value={form.url}
            onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
            required
          />
          <Input
            id="webhook-description"
            label="Description (optional)"
            placeholder="What is this webhook for?"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Events</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {eventGroups.map(({ group, events }) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {events.map(({ event: ev, description }) => {
                      const selected = form.events.includes(ev);
                      return (
                        <button
                          key={ev}
                          type="button"
                          title={description}
                          onClick={() => toggleEvent(ev)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-mono transition-colors ${
                            selected
                              ? 'bg-primary text-primary-fg border-primary'
                              : 'bg-surface-base text-text-secondary border-border hover:border-primary'
                          }`}
                        >
                          {ev}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input
            id="webhook-tags"
            label="Tags (optional, comma-separated)"
            placeholder="billing, prod"
            value={form.tagsText}
            onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
          />

          <Input
            id="webhook-rate-limit"
            label="Rate limit (optional, deliveries/minute)"
            type="number"
            placeholder="Unlimited"
            value={form.rateLimitText}
            onChange={(e) => setForm((p) => ({ ...p, rateLimitText: e.target.value }))}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">Custom headers (optional)</p>
              <Button type="button" variant="ghost" size="sm" onClick={addHeaderRow}>Add header</Button>
            </div>
            {form.headerRows.length === 0 ? (
              <p className="text-xs text-text-secondary">No custom headers. Reserved headers (Content-Type, X-Webhook-*, User-Agent) can&apos;t be overridden.</p>
            ) : (
              <div className="space-y-2">
                {form.headerRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono"
                      placeholder="X-Custom-Header"
                      value={row.key}
                      onChange={(e) => updateHeaderRow(i, 'key', e.target.value)}
                    />
                    <input
                      className="flex-1 rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono"
                      placeholder="value"
                      value={row.value}
                      onChange={(e) => updateHeaderRow(i, 'value', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeHeaderRow(i)}
                      className="text-text-secondary hover:text-error px-1"
                      aria-label="Remove header"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-text-primary mb-1">Event filters (optional, advanced)</p>
            <p className="text-xs text-text-secondary mb-2">
              JSON map of <code>{'{ "event": { "data.path": value } }'}</code>. A delivery is skipped when the payload doesn&apos;t match.
            </p>
            <textarea
              className="w-full rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono min-h-24"
              placeholder={'{\n  "payment.completed": { "currency": "USD" }\n}'}
              value={form.filtersText}
              onChange={(e) => setForm((p) => ({ ...p, filtersText: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!triggerWebhook}
        onClose={() => setTriggerWebhook(null)}
        title="Trigger event"
        description={triggerWebhook ? `Send a real event to "${triggerWebhook.name}" with a sample payload.` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTriggerWebhook(null)} disabled={triggering}>Cancel</Button>
            <Button variant="primary" onClick={handleTrigger} loading={triggering}>Trigger</Button>
          </>
        }
      >
        <div className="space-y-4">
          {triggerError && <AlertBanner variant="error" message={triggerError} />}
          <div>
            <label htmlFor="trigger-event" className="text-sm font-medium text-text-primary mb-1 block">Event</label>
            <select
              id="trigger-event"
              className="w-full rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono"
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value as WebhookEvent)}
            >
              {(triggerWebhook?.events ?? []).map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="trigger-payload" className="text-sm font-medium text-text-primary mb-1 block">Sample payload (JSON)</label>
            <textarea
              id="trigger-payload"
              className="w-full rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm font-mono min-h-32"
              value={triggerPayload}
              onChange={(e) => setTriggerPayload(e.target.value)}
            />
          </div>
        </div>
      </Modal>

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

      <Modal
        open={!!deliveriesWebhook}
        onClose={() => setDeliveriesWebhook(null)}
        title={`Deliveries — ${deliveriesWebhook?.name ?? ''}`}
        description={deliveriesWebhook?.url}
        size="lg"
      >
        {deliveriesLoading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : (
          <div className="space-y-3">
            {deadLetterCount > 0 && deliveriesWebhook && (
              <AlertBanner
                variant="warning"
                message={`${deadLetterCount} delivery exhausted all retries and is dead-lettered.`}
                action={{
                  label: 'Replay all',
                  onClick: () => handleReplayDeadLetter(deliveriesWebhook.webhookId),
                }}
              />
            )}
            <ServerDataTable
              columns={deliveryColumns}
              rows={deliveries}
              getRowKey={(d) => d.deliveryId}
              page={1}
              totalPages={1}
              total={deliveries.length}
              onPageChange={() => {}}
              emptyMessage="No deliveries yet."
              hidePagination
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
