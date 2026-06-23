'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FulfillmentStatusBadge, type FulfillmentStatus } from '@kuraykaraaslan/order_fulfillment/ui/fulfillment-status-badge.component';
import { FulfillmentItemsPanel } from '@kuraykaraaslan/order_fulfillment/ui/fulfillment-items-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faBoxOpen, faTruck, faCircleCheck, faBan } from '@fortawesome/free-solid-svg-icons';

type FulfillmentItem = { fulfillmentItemId: string; name: string; quantity: number };
type FulfillmentEvent = { fulfillmentEventId: string; status: string; message?: string | null; createdAt: string };

type Fulfillment = {
  fulfillmentId: string;
  orderId: string;
  status: FulfillmentStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  notes?: string | null;
  items: FulfillmentItem[];
  events: FulfillmentEvent[];
};

type Form = { carrier: string; trackingNumber: string; trackingUrl: string; notes: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const TRANSITIONS: { action: string; label: string; from: FulfillmentStatus[]; icon: typeof faBoxOpen }[] = [
  { action: 'pack', label: 'Pack', from: ['PENDING', 'PROCESSING', 'BACKORDERED'], icon: faBoxOpen },
  { action: 'ship', label: 'Ship', from: ['PACKED', 'PENDING', 'PROCESSING'], icon: faTruck },
  { action: 'deliver', label: 'Deliver', from: ['SHIPPED', 'IN_TRANSIT'], icon: faCircleCheck },
  { action: 'cancel', label: 'Cancel', from: ['PENDING', 'PROCESSING', 'BACKORDERED', 'PACKED', 'SHIPPED', 'IN_TRANSIT'], icon: faBan },
];

export default function FulfillmentDetailPage({ params }: { params: Promise<{ tenantId: string; fulfillmentId: string }> }) {
  const { tenantId, fulfillmentId } = use(params);

  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [working, setWorking] = useState(false);

  const [form, setForm] = useState<Form>({ carrier: '', trackingNumber: '', trackingUrl: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/fulfillment/${fulfillmentId}`);
      const f: Fulfillment = res.data.item;
      setFulfillment(f);
      setForm({
        carrier: f.carrier ?? '',
        trackingNumber: f.trackingNumber ?? '',
        trackingUrl: f.trackingUrl ?? '',
        notes: f.notes ?? '',
      });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load fulfillment.'));
    } finally { setLoading(false); }
  }, [tenantId, fulfillmentId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/fulfillment/${fulfillmentId}`, {
        carrier: form.carrier || undefined,
        trackingNumber: form.trackingNumber || undefined,
        trackingUrl: form.trackingUrl || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Fulfillment saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function runTransition(action: string) {
    setWorking(true);
    try {
      await api.post(`/tenant/${tenantId}/api/fulfillment/${fulfillmentId}/${action}`, {});
      toast.success(`Fulfillment ${action}`);
      load();
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action}.`));
    } finally { setWorking(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!fulfillment) return null;

  const itemCount = fulfillment.items.reduce((s, i) => s + Number(i.quantity), 0);

  const availableActions = TRANSITIONS.filter((t) => t.from.includes(fulfillment.status)).map((t) => ({
    label: <><FontAwesomeIcon icon={t.icon} /> {t.label}</>,
    onClick: () => runTransition(t.action),
    disabled: working,
  }));

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Shipment</h3>
            <Input id="f-carrier" label="Carrier" value={form.carrier}
              onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))} />
            <div className="flex gap-3">
              <div className="flex-1">
                <Input id="f-tracking" label="Tracking Number" value={form.trackingNumber}
                  onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))} />
              </div>
              <div className="flex-1">
                <Input id="f-tracking-url" label="Tracking URL" value={form.trackingUrl}
                  onChange={(e) => setForm((f) => ({ ...f, trackingUrl: e.target.value }))} />
              </div>
            </div>
            <Input id="f-notes" label="Notes" value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Status</span>
              <FulfillmentStatusBadge status={fulfillment.status} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Order</span>
              <span className="tabular-nums text-text-primary">{fulfillment.orderId.slice(0, 8)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Items</span>
              <span className="tabular-nums font-semibold text-text-primary">{itemCount}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const eventsContent = (
    <Card>
      <div className="p-6">
        {fulfillment.events.length === 0 ? (
          <p className="text-sm text-text-secondary">No events yet.</p>
        ) : (
          <ol className="space-y-4">
            {fulfillment.events.map((ev) => (
              <li key={ev.fulfillmentEventId} className="flex items-start gap-3">
                <FulfillmentStatusBadge status={ev.status} size="sm" dot />
                <div className="min-w-0">
                  {ev.message && <p className="text-sm text-text-primary">{ev.message}</p>}
                  <p className="text-xs text-text-secondary">{new Date(ev.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'items', label: 'Items',
      content: <FulfillmentItemsPanel tenantId={tenantId} fulfillmentId={fulfillmentId} onRefresh={load} />,
    },
    { id: 'events', label: 'Events', content: eventsContent },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Fulfillment', href: `/tenant/${tenantId}/admin/fulfillment` },
        { label: fulfillment.fulfillmentId.slice(0, 8) },
      ]} />

      <PageHeader
        title={`Fulfillment ${fulfillment.fulfillmentId.slice(0, 8)}`}
        subtitle={`${itemCount} item${itemCount !== 1 ? 's' : ''}`}
        badge={<FulfillmentStatusBadge status={fulfillment.status} />}
        actions={[
          ...availableActions,
          { label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving },
        ]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
