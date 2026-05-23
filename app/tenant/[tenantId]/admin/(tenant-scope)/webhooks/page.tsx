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
} from '@fortawesome/free-solid-svg-icons';

/**
 * Unified webhook event catalog. Every tenant — including the root tenant —
 * uses the same `Webhook` table. The root tenant subscribes to platform-wide
 * events (user.*, tenant.*, plan.*); regular tenants subscribe to tenant-local
 * events (member.*, invitation.*, subscription.*, payment.*, api_key.*).
 *
 * UI hides platform-only event groups from non-root tenants and tenant-local
 * groups from the root tenant — the actual enum is unified server-side.
 */
type WebhookEvent =
  // tenant-scoped
  | 'tenant.updated'
  | 'member.created' | 'member.updated' | 'member.deleted'
  | 'invitation.sent' | 'invitation.accepted' | 'invitation.declined' | 'invitation.revoked'
  | 'subscription.created' | 'subscription.updated' | 'subscription.cancelled'
  | 'payment.completed' | 'payment.failed' | 'payment.refunded'
  | 'api_key.created' | 'api_key.deleted'
  // platform-only
  | 'user.created' | 'user.updated' | 'user.deleted' | 'user.suspended'
  | 'tenant.created' | 'tenant.deleted' | 'tenant.suspended'
  | 'plan.created' | 'plan.updated' | 'plan.deleted'
  | 'subscription.assigned';

const TENANT_EVENT_GROUPS: { group: string; events: WebhookEvent[] }[] = [
  { group: 'Tenant',        events: ['tenant.updated'] },
  { group: 'Members',       events: ['member.created', 'member.updated', 'member.deleted'] },
  { group: 'Invitations',   events: ['invitation.sent', 'invitation.accepted', 'invitation.declined', 'invitation.revoked'] },
  { group: 'Subscriptions', events: ['subscription.created', 'subscription.updated', 'subscription.cancelled'] },
  { group: 'Payments',      events: ['payment.completed', 'payment.failed', 'payment.refunded'] },
  { group: 'API Keys',      events: ['api_key.created', 'api_key.deleted'] },
];

const PLATFORM_EVENT_GROUPS: { group: string; events: WebhookEvent[] }[] = [
  { group: 'Users',         events: ['user.created', 'user.updated', 'user.deleted', 'user.suspended'] },
  { group: 'Tenants',       events: ['tenant.created', 'tenant.updated', 'tenant.deleted', 'tenant.suspended'] },
  { group: 'Plans',         events: ['plan.created', 'plan.updated', 'plan.deleted'] },
  { group: 'Subscriptions', events: ['subscription.assigned', 'subscription.updated', 'subscription.cancelled'] },
];

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
  const eventGroups = isRoot ? PLATFORM_EVENT_GROUPS : TENANT_EVENT_GROUPS;

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [createOpen, setCreateOpen]   = useState(false);
  const [createForm, setCreateForm]   = useState({ name: '', description: '', url: '', events: [] as WebhookEvent[] });
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<Webhook | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  const [deliveriesWebhook, setDeliveriesWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries]               = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const [testing, setTesting]           = useState<string | null>(null);
  const [redelivering, setRedelivering] = useState<string | null>(null);

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

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

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
    if (!createForm.url.trim())  { setCreateError('URL is required.');  return; }
    if (createForm.events.length === 0) { setCreateError('Select at least one event.'); return; }

    setCreating(true);
    try {
      await api.post(apiBase, createForm);
      setCreateOpen(false);
      toast.success('Webhook created.');
      fetchWebhooks();
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create webhook.'));
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(webhook: Webhook) {
    try {
      await api.patch(`${apiBase}/${webhook.webhookId}`, {
        isActive: !webhook.isActive,
      });
      setWebhooks((prev) =>
        prev.map((w) => w.webhookId === webhook.webhookId ? { ...w, isActive: !w.isActive } : w),
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
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle
            id={`toggle-${w.webhookId}`}
            label=""
            checked={w.isActive}
            onChange={() => handleToggleActive(w)}
          />
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
                label: testing === w.webhookId ? 'Testing…' : 'Send test event',
                icon: <FontAwesomeIcon icon={faFlask} />,
                onClick: () => handleTest(w.webhookId),
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
        actions={[{ label: 'New Webhook', onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

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
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={isRoot ? 'New Platform Webhook' : 'New Webhook'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}

          <Input
            id="webhook-name"
            label="Name"
            placeholder="My webhook"
            value={createForm.name}
            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Input
            id="webhook-url"
            label="URL"
            placeholder="https://your-service.com/webhook"
            value={createForm.url}
            onChange={(e) => setCreateForm((p) => ({ ...p, url: e.target.value }))}
            required
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
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {eventGroups.map(({ group, events }) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">{group}</p>
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
