'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { EmptyState } from '@/modules_next/common/ui/EmptyState';
import { Toggle } from '@/modules_next/common/ui/Toggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLink,
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

type SystemWebhookEvent =
  | 'user.created' | 'user.updated' | 'user.deleted' | 'user.suspended'
  | 'tenant.created' | 'tenant.updated' | 'tenant.deleted' | 'tenant.suspended'
  | 'plan.created' | 'plan.updated' | 'plan.deleted'
  | 'subscription.assigned' | 'subscription.updated' | 'subscription.cancelled';

type Webhook = {
  webhookId: string;
  name: string;
  description: string | null;
  url: string;
  events: SystemWebhookEvent[];
  isActive: boolean;
  createdAt: string;
};

type Delivery = {
  deliveryId: string;
  event: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  attempts: number;
  responseStatus: number | null;
  errorMessage: string | null;
  duration: number | null;
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_EVENTS: { group: string; events: SystemWebhookEvent[] }[] = [
  { group: 'Users', events: ['user.created', 'user.updated', 'user.deleted', 'user.suspended'] },
  { group: 'Tenants', events: ['tenant.created', 'tenant.updated', 'tenant.deleted', 'tenant.suspended'] },
  { group: 'Plans', events: ['plan.created', 'plan.updated', 'plan.deleted'] },
  { group: 'Subscriptions', events: ['subscription.assigned', 'subscription.updated', 'subscription.cancelled'] },
];

const BASE = '/system/api/webhooks/outgoing';

const statusIcon = (s: Delivery['status']) =>
  s === 'SUCCESS' ? faCircleCheck : s === 'FAILED' ? faCircleXmark : faClock;

const statusVariant = (s: Delivery['status']): 'success' | 'error' | 'warning' =>
  s === 'SUCCESS' ? 'success' : s === 'FAILED' ? 'error' : 'warning';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemWebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', url: '', events: [] as SystemWebhookEvent[] });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<Webhook | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ webhookId: string; success: boolean; message: string } | null>(null);

  const [redelivering, setRedelivering] = useState<string | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`${BASE}?pageSize=100`);
      setWebhooks(res.data.webhooks ?? []);
    } catch {
      setError('Failed to load webhooks. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const fetchDeliveries = useCallback(async (webhookId: string) => {
    setDeliveriesLoading(true);
    try {
      const res = await api.get(`${BASE}/${webhookId}/deliveries?pageSize=20`);
      setDeliveries((prev) => ({ ...prev, [webhookId]: res.data.deliveries ?? [] }));
    } catch {
      // silent — user can retry by toggling the panel
    } finally {
      setDeliveriesLoading(false);
    }
  }, []);

  // ─── Create ─────────────────────────────────────────────────────────────────

  function toggleEvent(ev: SystemWebhookEvent) {
    setCreateForm((prev) => ({
      ...prev,
      events: prev.events.includes(ev) ? prev.events.filter((e) => e !== ev) : [...prev.events, ev],
    }));
  }

  async function handleCreate() {
    setCreateError('');
    if (!createForm.name.trim()) { setCreateError('Name is required.'); return; }
    if (!createForm.url.trim()) { setCreateError('URL is required.'); return; }
    if (createForm.events.length === 0) { setCreateError('Select at least one event.'); return; }

    setCreating(true);
    try {
      await api.post(BASE, createForm);
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
      await api.patch(`${BASE}/${webhook.webhookId}`, { isActive: !webhook.isActive });
      setWebhooks((prev) =>
        prev.map((w) => w.webhookId === webhook.webhookId ? { ...w, isActive: !w.isActive } : w),
      );
    } catch {
      // noop
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`${BASE}/${confirmDelete.webhookId}`);
      setWebhooks((prev) => prev.filter((w) => w.webhookId !== confirmDelete.webhookId));
      setConfirmDelete(null);
    } catch {
      // noop
    } finally {
      setDeleting(false);
    }
  }

  // ─── Test ────────────────────────────────────────────────────────────────────

  async function handleTest(webhookId: string) {
    setTesting(webhookId);
    setTestResult(null);
    try {
      const res = await api.post(`${BASE}/${webhookId}/test`);
      const d: Delivery = res.data.delivery;
      setTestResult({
        webhookId,
        success: d.status === 'SUCCESS',
        message: d.status === 'SUCCESS'
          ? `Test delivered — HTTP ${d.responseStatus} in ${d.duration}ms`
          : `Test failed — ${d.errorMessage ?? `HTTP ${d.responseStatus}`}`,
      });
      if (expanded === webhookId) fetchDeliveries(webhookId);
    } catch (err: any) {
      setTestResult({ webhookId, success: false, message: err?.response?.data?.message ?? 'Test request failed.' });
    } finally {
      setTesting(null);
    }
  }

  // ─── Expand ──────────────────────────────────────────────────────────────────

  function toggleExpand(webhookId: string) {
    if (expanded === webhookId) { setExpanded(null); return; }
    setExpanded(webhookId);
    fetchDeliveries(webhookId);
  }

  // ─── Redeliver ───────────────────────────────────────────────────────────────

  async function handleRedeliver(webhookId: string, deliveryId: string) {
    setRedelivering(deliveryId);
    try {
      await api.post(`${BASE}/${webhookId}/deliveries/${deliveryId}/redeliver`);
      fetchDeliveries(webhookId);
    } catch {
      // noop
    } finally {
      setRedelivering(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Webhooks"
        subtitle="Send real-time HTTP notifications for system-wide events (user registration, tenant creation, plan changes, etc.)."
        actions={[{
          label: 'New Webhook',
          variant: 'primary',
          onClick: () => { setCreateForm({ name: '', description: '', url: '', events: [] }); setCreateError(''); setCreateOpen(true); },
        }]}
      />

      {error && <AlertBanner variant="error" message={error} />}

      {testResult && (
        <AlertBanner
          key={testResult.webhookId}
          variant={testResult.success ? 'success' : 'error'}
          message={testResult.message}
          dismissible
        />
      )}

      {webhooks.length === 0 ? (
        <EmptyState
          icon={<FontAwesomeIcon icon={faLink} className="h-8 w-8" />}
          title="No system webhooks yet"
          description="Create a system webhook to notify external services about user and tenant lifecycle events."
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
              New Webhook
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <Card key={webhook.webhookId} className="overflow-hidden">
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
                    id={`toggle-${webhook.webhookId}`}
                    label=""
                    checked={webhook.isActive}
                    onChange={() => handleToggleActive(webhook)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(webhook.webhookId)}
                    disabled={testing === webhook.webhookId}
                    title="Send test event"
                  >
                    {testing === webhook.webhookId ? <Spinner size="sm" /> : <FontAwesomeIcon icon={faFlask} className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(webhook)}
                    title="Delete"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-4 w-4 text-error" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(webhook.webhookId)}
                    title="Deliveries"
                  >
                    <FontAwesomeIcon icon={expanded === webhook.webhookId ? faChevronUp : faChevronDown} className="h-4 w-4" />
                  </Button>
                </div>
              </div>

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
                            className={`h-4 w-4 shrink-0 ${d.status === 'SUCCESS' ? 'text-success' : d.status === 'FAILED' ? 'text-error' : 'text-warning'}`}
                          />
                          <span className="font-mono text-xs text-text-secondary w-40 truncate shrink-0">{d.event}</span>
                          <Badge variant={statusVariant(d.status)} className="shrink-0">{d.status}</Badge>
                          {d.responseStatus && <span className="text-xs text-text-tertiary shrink-0">HTTP {d.responseStatus}</span>}
                          {d.duration != null && <span className="text-xs text-text-tertiary shrink-0">{d.duration}ms</span>}
                          {d.errorMessage && <span className="text-xs text-error truncate flex-1">{d.errorMessage}</span>}
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
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New System Webhook">
        <div className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}

          <Input
            id="webhook-name"
            label="Name"
            placeholder="My system webhook"
            value={createForm.name}
            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            id="webhook-url"
            label="URL"
            placeholder="https://your-service.com/webhook"
            value={createForm.url}
            onChange={(e) => setCreateForm((p) => ({ ...p, url: e.target.value }))}
          />
          <Input
            id="webhook-description"
            label="Description (optional)"
            placeholder="What is this webhook for?"
            value={createForm.description}
            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
          />

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Events</p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {ALL_EVENTS.map(({ group, events }) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">{group}</p>
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
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? <Spinner size="sm" /> : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete System Webhook">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-text-primary">{confirmDelete?.name}</span>?
            All delivery history will also be removed.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
