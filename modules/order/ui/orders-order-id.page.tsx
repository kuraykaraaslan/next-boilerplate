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
import { OrderStatusBadge, type OrderStatus } from '@kuraykaraaslan/order/ui/order-status-badge.component';
import { OrderLinesPanel } from '@kuraykaraaslan/order/ui/order-lines-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCheck, faBoxOpen, faBan } from '@fortawesome/free-solid-svg-icons';

type Order = {
  orderId: string;
  number: string;
  customerId?: string | null;
  status: OrderStatus;
  currency?: string | null;
  reference?: string | null;
  total: number;
};

type Form = { number: string; customerId: string; currency: string; reference: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const TRANSITIONS: { action: string; label: string; from: OrderStatus[]; icon: typeof faCheck }[] = [
  { action: 'confirm', label: 'Confirm', from: ['DRAFT'], icon: faCheck },
  { action: 'fulfill', label: 'Fulfill', from: ['CONFIRMED', 'PAID'], icon: faBoxOpen },
  { action: 'cancel', label: 'Cancel', from: ['DRAFT', 'CONFIRMED', 'PAID'], icon: faBan },
];

export default function OrderDetailPage({ params }: { params: Promise<{ tenantId: string; orderId: string }> }) {
  const { tenantId, orderId } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [working, setWorking] = useState(false);

  const [form, setForm] = useState<Form>({ number: '', customerId: '', currency: '', reference: '' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/orders/${orderId}`);
      const o: Order = res.data.item;
      setOrder(o);
      setForm({
        number: o.number,
        customerId: o.customerId ?? '',
        currency: o.currency ?? '',
        reference: o.reference ?? '',
      });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load order.'));
    } finally { setLoading(false); }
  }, [tenantId, orderId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/orders/${orderId}`, {
        number: form.number,
        customerId: form.customerId || undefined,
        currency: form.currency || undefined,
        reference: form.reference || undefined,
      });
      toast.success('Order saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function runTransition(action: string) {
    setWorking(true);
    try {
      await api.post(`/tenant/${tenantId}/api/orders/${orderId}/${action}`);
      toast.success(`Order ${action}ed`);
      load();
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action}.`));
    } finally { setWorking(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!order) return null;

  function fmtTotal() {
    const v = Number(order!.total) || 0;
    if (!order!.currency) return v.toFixed(2);
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: order!.currency }).format(v); }
    catch { return `${v.toFixed(2)} ${order!.currency}`; }
  }

  const availableActions = TRANSITIONS.filter((t) => t.from.includes(order.status)).map((t) => ({
    label: <><FontAwesomeIcon icon={t.icon} /> {t.label}</>,
    onClick: () => runTransition(t.action),
    disabled: working,
  }));

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Header</h3>
            <Input id="o-number" label="Number" required value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
            <Input id="o-customer" label="Customer ID" value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} />
            <div className="flex gap-3">
              <div className="flex-1">
                <Input id="o-currency" label="Currency" value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
              </div>
              <div className="flex-1">
                <Input id="o-reference" label="Reference" value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Status</span>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Total</span>
              <span className="tabular-nums font-semibold text-text-primary">{fmtTotal()}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'lines', label: 'Lines',
      content: <OrderLinesPanel tenantId={tenantId} orderId={orderId} currency={order.currency} onRefresh={load} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Orders', href: `/tenant/${tenantId}/admin/orders` },
        { label: order.number },
      ]} />

      <PageHeader
        title={order.number}
        subtitle={fmtTotal()}
        badge={<OrderStatusBadge status={order.status} />}
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
