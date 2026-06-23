'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader, type PageHeaderAction } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { PurchaseOrderStatusBadge, type PurchaseOrderStatus } from './purchase-order-status-badge.component';
import { PurchaseOrderLinesPanel } from './purchase-order-lines-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCheck, faTruck, faBan } from '@fortawesome/free-solid-svg-icons';

type PurchaseOrder = {
  purchaseOrderId: string;
  supplierId: string;
  number: string;
  status: PurchaseOrderStatus | string;
  currency?: string | null;
  reference?: string | null;
  total?: number | null;
};

type Form = { supplierId: string; number: string; currency: string; reference: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ tenantId: string; purchaseOrderId: string }> }) {
  const { tenantId, purchaseOrderId } = use(params);

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [acting, setActing] = useState(false);
  const [form, setForm] = useState<Form>({ supplierId: '', number: '', currency: '', reference: '' });

  const basePath = `/tenant/${tenantId}/api/procurement/purchase-orders/${purchaseOrderId}`;

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(basePath);
      const o: PurchaseOrder = res.data.item;
      setOrder(o);
      setForm({
        supplierId: o.supplierId, number: o.number,
        currency: o.currency ?? '', reference: o.reference ?? '',
      });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load purchase order.'));
    } finally { setLoading(false); }
  }, [basePath]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(basePath, {
        supplierId: form.supplierId,
        number: form.number,
        currency: form.currency || undefined,
        reference: form.reference || undefined,
      });
      toast.success('Purchase order saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function runTransition(action: string, label: string) {
    setActing(true);
    try {
      await api.post(`${basePath}/${action}`, {});
      toast.success(`${label} applied`);
      load();
    } catch (err) { toast.error(extractMessage(err, `Failed to ${label.toLowerCase()}.`)); }
    finally { setActing(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!order) return null;

  const status = order.status as PurchaseOrderStatus;

  const transitionActions: PageHeaderAction[] = [];
  if (status === 'DRAFT') {
    transitionActions.push({ label: <><FontAwesomeIcon icon={faCheck} /> Confirm Order</>, variant: 'secondary', onClick: () => runTransition('order', 'Confirm Order'), disabled: acting });
  }
  if (status === 'ORDERED') {
    transitionActions.push({ label: <><FontAwesomeIcon icon={faTruck} /> Receive</>, variant: 'secondary', onClick: () => runTransition('receive', 'Receive'), disabled: acting });
  }
  if (status === 'DRAFT' || status === 'ORDERED') {
    transitionActions.push({ label: <><FontAwesomeIcon icon={faBan} /> Cancel</>, variant: 'danger', onClick: () => runTransition('cancel', 'Cancel'), disabled: acting });
  }

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Header</h3>
            <Input id="po-supplier" label="Supplier" required value={form.supplierId}
              onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} />
            <Input id="po-number" label="Number" required value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
            <div className="flex gap-3">
              <div className="flex-1">
                <Input id="po-currency" label="Currency" value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
              </div>
              <div className="flex-1">
                <Input id="po-reference" label="Reference" value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">Total</h3>
            <p className="text-2xl font-bold tabular-nums text-text-primary">
              {Number(order.total ?? 0).toFixed(2)} {order.currency ?? ''}
            </p>
            <p className="text-xs text-text-secondary">Computed from line items.</p>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    { id: 'lines', label: 'Lines',
      content: <PurchaseOrderLinesPanel tenantId={tenantId} purchaseOrderId={purchaseOrderId} onRefresh={load} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Purchase Orders', href: `/tenant/${tenantId}/admin/procurement/purchase-orders` },
        { label: order.number },
      ]} />

      <PageHeader
        title={order.number}
        subtitle={order.supplierId}
        badge={<PurchaseOrderStatusBadge status={status} />}
        actions={[
          ...transitionActions,
          { label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving },
        ]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
