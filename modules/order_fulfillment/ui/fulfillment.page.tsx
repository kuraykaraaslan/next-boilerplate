'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { FulfillmentStatusBadge } from '@kuraykaraaslan/order_fulfillment/ui/fulfillment-status-badge.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash, faGear } from '@fortawesome/free-solid-svg-icons';

type Fulfillment = {
  fulfillmentId: string;
  orderId: string;
  status: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
};

type Form = { orderId: string; carrier: string; itemName: string; quantity: string };
const EMPTY_FORM: Form = { orderId: '', carrier: '', itemName: '', quantity: '1' };
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function FulfillmentPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<Fulfillment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number, q: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/fulfillment`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, trackingNumber: q || undefined },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load fulfillments.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page, search); }, [page, search, fetchRows]);

  function openCreate() { setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/fulfillment`, {
        orderId: form.orderId,
        carrier: form.carrier || undefined,
        items: [{ name: form.itemName, quantity: Number(form.quantity) || 1 }],
      });
      toast.success('Fulfillment created');
      setModalOpen(false);
      const id = res.data.item?.fulfillmentId;
      if (id) router.push(`/tenant/${tenantId}/admin/fulfillment/${id}`);
      else fetchRows(page, search);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create fulfillment.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(f: Fulfillment) {
    if (!window.confirm('Cancel this fulfillment?')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/fulfillment/${f.fulfillmentId}`);
      toast.success('Fulfillment cancelled');
      fetchRows(page, search);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to cancel.'));
    }
  }

  const columns: TableColumn<Fulfillment>[] = [
    { key: 'fulfillmentId', header: 'Reference', render: (f) => <span className="font-medium text-text-primary">{f.fulfillmentId.slice(0, 8)}</span> },
    { key: 'status', header: 'Status', render: (f) => <FulfillmentStatusBadge status={f.status} size="sm" dot /> },
    { key: 'carrier', header: 'Carrier', render: (f) => <span className="text-text-secondary">{f.carrier ?? '—'}</span> },
    { key: 'trackingNumber', header: 'Tracking', render: (f) => <span className="text-text-secondary">{f.trackingNumber ?? '—'}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (f) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Open', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => router.push(`/tenant/${tenantId}/admin/fulfillment/${f.fulfillmentId}`) },
            { label: 'Cancel', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(f) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fulfillment"
        subtitle={loading ? '…' : `${total} fulfillment${total !== 1 ? 's' : ''}`}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/fulfillment/settings`, variant: 'ghost' as const },
          { label: <><FontAwesomeIcon icon={faPlus} /> New Fulfillment</>, onClick: openCreate },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(f) => f.fulfillmentId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(f) => router.push(`/tenant/${tenantId}/admin/fulfillment/${f.fulfillmentId}`)}
        loading={loading}
        emptyMessage="No fulfillments yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="fulfillment-search"
              label="Search"
              placeholder="Filter by tracking number…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Fulfillment"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving} disabled={!form.orderId || !form.itemName}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="ff-order" label="Order ID" required value={form.orderId}
            onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))} />
          <Input id="ff-carrier" label="Carrier" value={form.carrier}
            onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="ff-item" label="First Item" required value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="ff-qty" label="Quantity" type="number" value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
