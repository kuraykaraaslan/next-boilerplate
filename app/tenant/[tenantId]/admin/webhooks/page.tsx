'use client';
import { use, useEffect, useState, useCallback } from 'react';
import api from '@/libs/axios';
import { PageHeader } from '@/modules/ui/PageHeader';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { Input } from '@/modules/ui/Input';
import { Modal } from '@/modules/ui/Modal';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Spinner } from '@/modules/ui/Spinner';
import { EmptyState } from '@/modules/ui/EmptyState';
import { Toggle } from '@/modules/ui/Toggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWebhook,
  faPlus,
  faTrash,
  faFlask,
  faChevronDown,
  faChevronUp,
  faRotateRight,
  faCircleCheck,
  faCircleXmark,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type WebhookEvent =
  | 'tenant.updated'
  | 'member.created' | 'member.updated' | 'member.deleted'
  | 'invitation.sent' | 'invitation.accepted' | 'invitation.declined' | 'invitation.revoked'
  | 'subscription.created' | 'subscription.updated' | 'subscription.cancelled'
  | 'payment.completed' | 'payment.failed' | 'payment.refunded'
  | 'api_key.created' | 'api_key.deleted';

type Webhook = {
  webhookId: string;
  name: string;
  description: string | null;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Delivery = {
  deliveryId: string;
  event: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  responseStatus: number | null;
  errorMessage: string | null;
  duration: number | null;
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_EVENTS: { group: string; events: WebhookEvent[] }[] = [
  { group: 'Tenant', events: ['tenant.updated'] },
  { group: 'Members', events: ['member.created', 'member.updated', 'member.deleted'] },
  { group: 'Invitations', events: ['invitation.sent', 'invitation.accepted', 'invitation.declined', 'invitation.revoked'] },
  { group: 'Subscriptions', events: ['subscription.created', 'subscription.updated', 'subscription.cancelled'] },
  { group: 'Payments', events: ['payment.completed', 'payment.failed', 'payment.refunded'] },
  { group: 'API Keys', events: ['api_key.created', 'api_key.deleted'] },
];

const statusVariant = (s: Delivery['status']): 'success' | 'error' | 'warning' => {
  if (s === 'SUCCESS') return 'success';
  if (s === 'FAILED') return 'error';
  return 'warning';
};

const statusIcon = (s: Delivery['status']) => {
  if (s === 'SUCCESS') return faCircleCheck;
  if (s === 'FAILED') return faCircleXmark;
  return faClock;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WebhooksPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', url: '', events: [] as WebhookEvent[] });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<Webhook | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded deliveries panel
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  // Test
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ webhookId: string; success: boolean; message: string } | null>(null);

  // Redeliver
  const [redelivering, setRedelivering] = useState<string | null>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/webhooks?pageSize=100`);
      setWebhooks(res.data.webhooks ?? []);
    } catch {
      setError('Failed to load webhooks. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const fetchDeliveries = useCallback(async (webhookId: string) => {
    setDeliveriesLoading(true);
    try {
      const res = await api.get(`/tenant/${tenantId}/api/webhooks/${webhookId}/deliveries?pageSize=20`);
      setDeliveries((prev) => ({ ...prev, [webhookId]: res.data.deliveries ?? [] }));
    } catch {
      // silently fail — user can retry by collapsing and re-expanding
    } finally {
      setDeliveriesLoading(false);
    }
  }, [tenantId]);

  // ─── Create ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateForm({ name: '', description: '', url: '', events: [] });
    setCreateError('');
    setCreateOpen(true);
  }

  function toggleEvent(event: WebhookEvent) {
    setCreateForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  async function handleCreate() {
    setCreateError('');
    if (!createForm.name.trim()) { setCreateError('Name is required.'); return; }
    if (!createForm.url.trim()) { setCreateError('URL is required.'); return; }
    if (createForm.events.length === 0) { setCreateError('Select at least one event.'); return; }

    setCreating(true);
    try {
      await api.post(`/tenant/${tenantId}/api/webhooks`, createForm);
      setCreateOpen(false);
      fetchWebhooks();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? 'Failed to create webhook.');
    } finally {
      setCreating(false);
    }
  }

  // ─── Toggle active ───────────────────────────────────────────────────────────

  async function handleToggleActive(webhook: Webhook) {
    try {
      await api.patch(`/tenant/${tenantId}/api/webhooks/${webhook.webhookId}`, {
        isActive: !webhook.isActive,
      });
      setWebhooks((prev) =>
        prev.map((w) => w.webhookId === webhook.webhookId ? { ...w, isActive: !w.isActive } : w),
      );
    } catch {
      // show nothing — the toggle will snap back on next fetch
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/tenant/${tenantId}/api/webhooks/${confirmDelete.webhookId}`);
      setWebhooks((prev) => prev.filter((w) => w.webhookId !== confirmDelete.webhookId));
      setConfirmDelete(null);
    } catch {
      // ignore — user can retry
    } finally {
      setDeleting(false);
    }
  }

  // ─── Test ────────────────────────────────────────────────────────────────────

  async function handleTest(webhookId: string) {
    setTesting(webhookId);
    setTestResult(null);
    try {
      const res = await api.post(`/tenant/${tenantId}/api/webhooks/${webhookId}/test`);
      const delivery: Delivery = res.data.delivery;
      setTestResult({
        webhookId,
        success: delivery.status === 'SUCCESS',
        message: delivery.status === 'SUCCESS'
          ? `Test delivered — HTTP ${delivery.responseStatus} in ${delivery.duration}ms`
          : `Test failed — ${delivery.errorMessage ?? `HTTP ${delivery.responseStatus}`}`,
      });
      // Refresh deliveries if panel is open
      if (expanded === webhookId) fetchDeliveries(webhookId);
    } catch (err: any) {
      setTestResult({
        webhookId,
        success: false,
        message: err?.response?.data?.message ?? 'Test request failed.',
      });
    } finally {
      setTesting(null);
    }
  }

  // ─── Expand / deliveries ─────────────────────────────────────────────────────

  function toggleExpand(webhookId: string) {
    if (expanded === webhookId) {
      setExpanded(null);
    } else {
      setExpanded(webhookId);
      fetchDeliveries(webhookId);
    }
  }

  // ─── Redeliver ───────────────────────────────────────────────────────────────

  async function handleRedeliver(webhookId: string, deliveryId: string) {
    setRedelivering(deliveryId);
    try {
      await api.post(`/tenant/${tenantId}/api/webhooks/${webhookId}/deliveries/${deliveryId}/redeliver`);
      fetchDeliveries(webhookId);
    } catch {
      // silently fail
    } finally {
      setRedelivering(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Webhooks"
        description="Receive real-time HTTP notifications when events occur in your tenant."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            New Webhook
          </Button>
        }
      />

      {error && <AlertBanner variant="error" message={error} />}

      {testResult && (
        <AlertBanner
          variant={testResult.success ? 'success' : 'error'}
          message={testResult.message}
          onDismiss={() => setTestResult(null)}
        />
      )}

      {webhooks.length === 0 ? (
        <EmptyState
          icon={faWebhook}
          title="No webhooks yet"
          description="Create a webhook to start receiving event notifications at your endpoint."
          action={
            <Button variant="primary" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
              New Webhook
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <Card key={webhook.webhookId} className="overflow-hidden">
              {/* ── Header row ── */}
              <div className="flex items-start gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary truncate">{webhook.name}</span>
                    <Badge variant={webhook.isActive ? 'success' : 'neutral'}>
                      {webhook.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary mt-0.5 truncate">{webhook.url}</p>
                  {webhook.description && (
                    <p className="text-xs text-text-tertiary mt-1">{webhook.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {webhook.events.map((ev) => (
                      <span
                        key={ev}
                        className="inline-flex items-center rounded-full bg-surface-raised px-2 py-0.5 text-xs text-text-secondary font-mono border border-border"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Toggle
                    checked={webhook.isActive}
                    onChange={() => handleToggleActive(webhook)}
                    aria-label={webhook.isActive ? 'Disable webhook' : 'Enable webhook'}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(webhook.webhookId)}
                    disabled={testing === webhook.webhookId}
                    title="Send test event"
                  >
                    {testing === webhook.webhookId
                      ? <Spinner size="sm" />
                      : <FontAwesomeIcon icon={faFlask} className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(webhook)}
                    title="Delete webhook"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-4 w-4 text-error" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(webhook.webhookId)}
                    title="View deliveries"
                  >
                    <FontAwesomeIcon
                      icon={expanded === webhook.webhookId ? faChevronUp : faChevronDown}
                      className="h-4 w-4"
                    />
                  </Button>
                </div>
              </div>

              {/* ── Deliveries panel ── */}
              {expanded === webhook.webhookId && (
                <div className="border-t border-border bg-surface-subtle px-5 py-4">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                    Recent Deliveries
                  </p>
                  {deliveriesLoading ? (
                    <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                  ) : (deliveries[webhook.webhookId] ?? []).length === 0 ? (
                    <p className="text-sm text-text-tertiary">No deliveries yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(deliveries[webhook.webhookId] ?? []).map((d) => (
                        <div
                          key={d.deliveryId}
                          className="flex items-center gap-3 text-sm rounded-lg border border-border bg-surface-base px-3 py-2"
                        >
                          <FontAwesomeIcon
                            icon={statusIcon(d.status)}
                            className={`h-4 w-4 shrink-0 ${
                              d.status === 'SUCCESS' ? 'text-success' :
                              d.status === 'FAILED'  ? 'text-error'   : 'text-warning'
                            }`}
                          />
                          <span className="font-mono text-xs text-text-secondary w-40 truncate shrink-0">
                            {d.event}
                          </span>
                          <Badge variant={statusVariant(d.status)} className="shrink-0">
                            {d.status}
                          </Badge>
                          {d.responseStatus && (
                            <span className="text-xs text-text-tertiary shrink-0">
                              HTTP {d.responseStatus}
                            </span>
                          )}
                          {d.duration != null && (
                            <span className="text-xs text-text-tertiary shrink-0">
                              {d.duration}ms
                            </span>
                          )}
                          {d.errorMessage && (
                            <span className="text-xs text-error truncate flex-1">
                              {d.errorMessage}
                            </span>
                          )}
                          <span className="text-xs text-text-tertiary shrink-0 ml-auto">
                            {new Date(d.createdAt).toLocaleString()}
                          </span>
                          {d.status === 'FAILED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRedeliver(webhook.webhookId, d.deliveryId)}
                              disabled={redelivering === d.deliveryId}
                              title="Redeliver"
                            >
                              {redelivering === d.deliveryId
                                ? <Spinner size="sm" />
                                : <FontAwesomeIcon icon={faRotateRight} className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Modal ── */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Webhook"
      >
        <div className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}

          <Input
            label="Name"
            placeholder="My webhook"
            value={createForm.name}
            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="URL"
            placeholder="https://your-service.com/webhook"
            value={createForm.url}
            onChange={(e) => setCreateForm((p) => ({ ...p, url: e.target.value }))}
          />
          <Input
            label="Description (optional)"
            placeholder="What is this webhook for?"
            value={createForm.description}
            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
          />

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Events</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {ALL_EVENTS.map(({ group, events }) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">
                    {group}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {events.map((ev) => {
                      const selected = createForm.events.includes(ev);
                      return (
                        <button
                          key={ev}
                          type="button"
                          onClick={() => toggleEvent(ev)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-mono transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? <Spinner size="sm" /> : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Webhook"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-text-primary">{confirmDelete?.name}</span>?
            All delivery history will also be removed.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
