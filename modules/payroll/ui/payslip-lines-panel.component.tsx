'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

type Line = { payslipLineId: string; name: string; type: string; amount?: string | null };
type ComponentOption = { componentId: string; name: string; type: string; amount?: string | null };
type LineForm = { name: string; type: string; amount: string };

const EMPTY_FORM: LineForm = { name: '', type: 'EARNING', amount: '' };
const TYPE_OPTIONS = [
  { value: 'EARNING', label: 'EARNING' },
  { value: 'DEDUCTION', label: 'DEDUCTION' },
];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = { tenantId: string; payslipId: string; onRefresh: () => void };

export function PayslipLinesPanel({ tenantId, payslipId, onRefresh }: Props) {
  const [lines, setLines]   = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm]     = useState<LineForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchLines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tenant/${tenantId}/api/payroll/payslips/${payslipId}/lines`, {
        params: { pageSize: 200 },
      });
      setLines(res.data.data ?? []);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to load lines.'));
    } finally { setLoading(false); }
  }, [tenantId, payslipId]);

  const fetchComponents = useCallback(async () => {
    try {
      const res = await api.get(`/tenant/${tenantId}/api/payroll/components`, { params: { pageSize: 100 } });
      setComponents(res.data.data ?? []);
    } catch { setComponents([]); }
  }, [tenantId]);

  useEffect(() => { fetchLines(); fetchComponents(); }, [fetchLines, fetchComponents]);

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }
  function openEdit(l: Line) {
    setEditId(l.payslipLineId);
    setForm({ name: l.name, type: l.type, amount: l.amount ?? '' });
    setFormError(''); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setForm(EMPTY_FORM); setEditId(null); setFormError(''); }

  function applyComponent(componentId: string) {
    const c = components.find((x) => x.componentId === componentId);
    if (!c) return;
    setForm({ name: c.name, type: c.type, amount: c.amount ?? '' });
  }

  async function handleSave() {
    if (!form.name || form.amount === '') { setFormError('Name and amount are required.'); return; }
    setSaving(true); setFormError('');
    const payload = { name: form.name, type: form.type, amount: Number(form.amount) };
    try {
      if (editId) {
        await api.patch(`/tenant/${tenantId}/api/payroll/payslips/${payslipId}/lines/${editId}`, payload);
        toast.success('Line updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/payroll/payslips/${payslipId}/lines`, payload);
        toast.success('Line added');
      }
      closeModal();
      await fetchLines();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save line.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(l: Line) {
    if (!confirm(`Remove line "${l.name}"?`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/payroll/payslips/${payslipId}/lines/${l.payslipLineId}`);
      toast.success('Line removed');
      await fetchLines();
      onRefresh();
    } catch (err) { toast.error(extractMessage(err, 'Failed to remove line.')); }
  }

  const columns: TableColumn<Line>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    {
      key: 'type', header: 'Type',
      render: (r) => <Badge size="sm" variant={r.type === 'DEDUCTION' ? 'error' : 'success'}>{r.type}</Badge>,
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{r.amount ?? '—'}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(r) },
            { label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Earnings and deductions for this payslip. Totals recompute automatically on every change.
        </p>
        <ServerDataTable
          columns={columns}
          rows={lines}
          getRowKey={(r) => r.payslipLineId}
          page={1}
          totalPages={1}
          total={lines.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No lines yet. Add an earning or deduction."
          headerRight={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} /> Add Line
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editId ? 'Edit Line' : 'Add Line'}
        footer={<>
          <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          {components.length > 0 && (
            <Select id="line-component" label="From salary component (optional)"
              options={[{ value: '', label: '— Select to prefill —' }, ...components.map((c) => ({ value: c.componentId, label: `${c.name} (${c.type})` }))]}
              value="" onChange={(e) => applyComponent(e.target.value)} />
          )}
          <Input id="line-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Select id="line-type" label="Type" options={TYPE_OPTIONS}
            value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
          <Input id="line-amount" label="Amount" type="number" required value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
        </div>
      </Modal>
    </>
  );
}
