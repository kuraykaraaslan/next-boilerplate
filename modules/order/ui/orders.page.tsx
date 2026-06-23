'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { OrderStatusBadge } from '@kuraykaraaslan/order/ui/order-status-badge.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Order = {
  orderId: string;
  number: string;
  customerId?: string | null;
  status: string;
  currency?: string | null;
  total: number;
  createdAt: string;
};

type OrderForm = {
  number: string;
  customerId: string;
  status: string;
  currency: string;
  total: string;
};

const EMPTY_FORM: OrderForm = { number: '', customerId: '', status: 'DRAFT', currency: '', total: '0' };
const STATUS_OPTIONS = ['DRAFT', 'CONFIRMED', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED'].map((s) => ({ value: s, label: s }));
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function OrdersPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<OrderForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number, q: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/orders`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load orders.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page, search); }, [page, search, fetchRows]);

  function openCreate() {
    setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }

  function openEdit(o: Order) {
    setEditId(o.orderId);
    setForm({
      number: o.number ?? '',
      customerId: o.customerId ?? '',
      status: o.status ?? 'DRAFT',
      currency: o.currency ?? '',
      total: String(o.total ?? 0),
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      number: form.number,
      customerId: form.customerId || undefined,
      status: form.status,
      currency: form.currency || undefined,
      total: Number(form.total) || 0,
    };
    try {
      if (editId) {
        await api.patch(`/tenant/${tenantId}/api/orders/${editId}`, payload);
        toast.success('Order updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/orders`, payload);
        toast.success('Order created');
      }
      setModalOpen(false);
      fetchRows(page, search);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save order.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(o: Order) {
    if (!window.confirm(`Delete order "${o.number}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/orders/${o.orderId}`);
      toast.success('Order deleted');
      fetchRows(page, search);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete order.'));
    }
  }

  const columns: TableColumn<Order>[] = [
    { key: 'number', header: 'Number', render: (o) => <span className="font-medium text-text-primary">{o.number}</span> },
    { key: 'status', header: 'Status', render: (o) => <OrderStatusBadge status={o.status} size="sm" dot /> },
    { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="tabular-nums text-text-secondary">{o.total}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (o) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Open', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => router.push(`/tenant/${tenantId}/admin/orders/${o.orderId}`) },
            { label: 'Quick edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(o) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(o) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        subtitle={loading ? '…' : `${total} order${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Order</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(o) => o.orderId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(o) => router.push(`/tenant/${tenantId}/admin/orders/${o.orderId}`)}
        loading={loading}
        emptyMessage="No orders yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="order-search"
              label="Search"
              placeholder="Filter by number…"
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
        title={editId ? 'Edit Order' : 'New Order'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="order-number" label="Number" required value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
          <Input id="order-customer" label="Customer ID" value={form.customerId}
            onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} />
          <Select id="order-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          <Input id="order-currency" label="Currency" value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
          <Input id="order-total" label="Total" type="number" value={form.total}
            onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
