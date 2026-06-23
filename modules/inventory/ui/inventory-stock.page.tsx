'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
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

type StockItem = {
  stockItemId: string;
  sku: string;
  warehouseId: string;
  uomId?: string | null;
  quantity: number;
  reserved: number;
  createdAt: string;
};

type UomOption = { uomId: string; name: string; code: string };

type Form = { sku: string; warehouseId: string; uomId: string; quantity: string; reserved: string };
const EMPTY: Form = { sku: '', warehouseId: '', uomId: '', quantity: '0', reserved: '0' };
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function InventoryStockPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [rows, setRows] = useState<StockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uoms, setUoms] = useState<UomOption[]>([]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/tenant/${tenantId}/api/inventory/stock`;

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/inventory/uoms`, { params: { pageSize: 100 } })
      .then((res) => setUoms(res.data.data ?? []))
      .catch(() => setUoms([]));
  }, [tenantId]);

  const uomOptions = [
    { value: '', label: '— None —' },
    ...uoms.map((u) => ({ value: u.uomId, label: `${u.name} (${u.code})` })),
  ];

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE, search: search || undefined } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load stock items.'));
    } finally { setLoading(false); }
  }, [base, search]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() { setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(s: StockItem) {
    setEditingId(s.stockItemId);
    setForm({ sku: s.sku ?? '', warehouseId: s.warehouseId ?? '', uomId: s.uomId ?? '', quantity: String(s.quantity ?? 0), reserved: String(s.reserved ?? 0) });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      sku: form.sku,
      warehouseId: form.warehouseId,
      uomId: form.uomId || undefined,
      quantity: Number(form.quantity),
      reserved: Number(form.reserved),
    };
    try {
      if (editingId) await api.patch(`${base}/${editingId}`, payload);
      else await api.post(base, payload);
      toast.success(editingId ? 'Stock item updated' : 'Stock item created');
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save stock item.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(s: StockItem) {
    if (!window.confirm(`Delete "${s.sku}"?`)) return;
    try {
      await api.delete(`${base}/${s.stockItemId}`);
      toast.success('Stock item deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete stock item.'));
    }
  }

  const columns: TableColumn<StockItem>[] = [
    { key: 'sku', header: 'SKU', render: (s) => <span className="font-medium text-text-primary">{s.sku}</span> },
    { key: 'warehouseId', header: 'Warehouse', render: (s) => <span className="text-text-secondary">{s.warehouseId}</span> },
    { key: 'quantity', header: 'Quantity', render: (s) => <span className="tabular-nums text-text-secondary">{s.quantity}</span> },
    { key: 'reserved', header: 'Reserved', render: (s) => <span className="tabular-nums text-text-secondary">{s.reserved}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(s) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(s) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        subtitle={loading ? '…' : `${total} item${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Stock Item</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(s) => s.stockItemId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No stock items yet."
        toolbar={
          <div className="pb-4">
            <Input id="stk-search" label="Search" placeholder="Filter by SKU…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Stock Item' : 'New Stock Item'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editingId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="stk-sku" label="SKU" required value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
          <Input id="stk-wh" label="Warehouse ID" required value={form.warehouseId}
            onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))} />
          <Select id="stk-uom" label="Unit of Measure" options={uomOptions} value={form.uomId}
            onChange={(e) => setForm((f) => ({ ...f, uomId: e.target.value }))} />
          <Input id="stk-qty" label="Quantity" type="number" value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          <Input id="stk-res" label="Reserved" type="number" value={form.reserved}
            onChange={(e) => setForm((f) => ({ ...f, reserved: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
