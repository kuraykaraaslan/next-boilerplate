'use client';

import { useState } from 'react';
import api from '@/modules_next/common/axios';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';

interface Props {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onCreated: (pageId: string) => void;
}

export function DynamicPageCreateModal({ open, tenantId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ title: '', slug: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function handleClose() {
    setForm({ title: '', slug: '' });
    setFormError('');
    onClose();
  }

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/dynamic-pages`, {
        title: form.title,
        slug: form.slug,
        status: 'DRAFT',
        sections: [],
      });
      setForm({ title: '', slug: '' });
      onClose();
      onCreated(res.data.page.dynamicPageId);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setFormError(e?.response?.data?.message ?? e?.message ?? 'Failed to create page.');
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Page"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} loading={saving} disabled={!form.title}>
            Create &amp; Edit
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError && <AlertBanner variant="error" message={formError} />}
        <Input
          id="pg-title" label="Title" required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <Input
          id="pg-slug" label="Slug"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          hint="Leave empty to auto-generate from title"
        />
      </div>
    </Modal>
  );
}
