'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

type ContactRow = {
  contactId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

type LineForm = { name: string; email: string; phone: string; role: string };
const EMPTY: LineForm = { name: '', email: '', phone: '', role: '' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  supplierId: string;
  onRefresh: () => void;
};

export function SupplierContactsPanel({ tenantId, supplierId, onRefresh }: Props) {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<LineForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const base = `/tenant/${tenantId}/api/suppliers/${supplierId}/lines`;

  const fetchLines = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: 0, pageSize: 200 } });
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load contacts.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchLines(); }, [fetchLines]);

  function openCreate() { setEditId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(r: ContactRow) {
    setEditId(r.contactId);
    setForm({ name: r.name, email: r.email ?? '', phone: r.phone ?? '', role: r.role ?? '' });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      role: form.role || undefined,
    };
    try {
      if (editId) {
        await api.patch(`${base}/${editId}`, payload);
        toast.success('Contact updated');
      } else {
        await api.post(base, payload);
        toast.success('Contact added');
      }
      setModalOpen(false);
      await fetchLines();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save contact.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: ContactRow) {
    if (!confirm(`Remove contact "${r.name}"?`)) return;
    try {
      await api.delete(`${base}/${r.contactId}`);
      toast.success('Contact removed');
      await fetchLines();
      onRefresh();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to remove contact.'));
    }
  }

  const columns: TableColumn<ContactRow>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { key: 'email', header: 'Email', render: (r) => <span className="text-text-secondary">{r.email ?? '—'}</span> },
    { key: 'phone', header: 'Phone', render: (r) => <span className="text-text-secondary">{r.phone ?? '—'}</span> },
    { key: 'role', header: 'Role', render: (r) => <span className="text-text-secondary">{r.role ?? '—'}</span> },
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
          getRowKey={(r) => r.contactId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No contacts yet. Add one to reach this supplier."
          headerRight={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} /> Add Contact
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Contact' : 'Add Contact'}
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.name}>{editId ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="contact-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="contact-email" label="Email" value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input id="contact-phone" label="Phone" value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input id="contact-role" label="Role" value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
        </div>
      </Modal>
    </>
  );
}
