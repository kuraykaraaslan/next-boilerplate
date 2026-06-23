'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

type FormFieldRow = {
  fieldId: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
};

type FieldForm = { label: string; type: string; required: boolean; order: string };
const EMPTY: FieldForm = { label: '', type: 'text', required: false, order: '0' };

const TYPE_OPTIONS = ['text', 'textarea', 'number', 'email', 'select', 'checkbox', 'date']
  .map((t) => ({ value: t, label: t }));

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  formId: string;
  onRefresh: () => void;
};

export function FormFieldsPanel({ tenantId, formId, onRefresh }: Props) {
  const [rows, setRows] = useState<FormFieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FieldForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const base = `/tenant/${tenantId}/api/forms/${formId}/lines`;

  const fetchLines = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: 0, pageSize: 200 } });
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load fields.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchLines(); }, [fetchLines]);

  function openCreate() { setEditId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(r: FormFieldRow) {
    setEditId(r.fieldId);
    setForm({ label: r.label, type: r.type, required: !!r.required, order: String(r.order) });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      label: form.label,
      type: form.type,
      required: form.required,
      order: Number(form.order) || 0,
    };
    try {
      if (editId) {
        await api.patch(`${base}/${editId}`, payload);
        toast.success('Field updated');
      } else {
        await api.post(base, payload);
        toast.success('Field added');
      }
      setModalOpen(false);
      await fetchLines();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save field.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: FormFieldRow) {
    if (!confirm(`Remove field "${r.label}"?`)) return;
    try {
      await api.delete(`${base}/${r.fieldId}`);
      toast.success('Field removed');
      await fetchLines();
      onRefresh();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to remove field.'));
    }
  }

  const columns: TableColumn<FormFieldRow>[] = [
    { key: 'label', header: 'Label', render: (r) => <span className="font-medium text-text-primary">{r.label}</span> },
    { key: 'type', header: 'Type', render: (r) => <span className="text-text-secondary">{r.type}</span> },
    { key: 'required', header: 'Required', render: (r) => <span className="text-text-secondary">{r.required ? 'Yes' : 'No'}</span> },
    { key: 'order', header: 'Order', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.order}</span> },
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
        {fetchError && <AlertBanner variant="error" message={fetchError} />}
        <ServerDataTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.fieldId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No fields yet. Add one to build this form."
          headerRight={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} /> Add Field
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Field' : 'Add Field'}
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.label}>{editId ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="field-label" label="Label" required value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          <Select id="field-type" label="Type" options={TYPE_OPTIONS}
            value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
          <div className="flex items-center gap-2">
            <input id="field-required" type="checkbox" checked={form.required}
              onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))} />
            <label htmlFor="field-required" className="text-sm text-text-secondary">Required</label>
          </div>
          <Input id="field-order" label="Order" type="number" value={form.order}
            onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />
        </div>
      </Modal>
    </>
  );
}
