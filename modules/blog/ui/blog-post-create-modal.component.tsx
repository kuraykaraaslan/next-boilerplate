'use client';
import { useState } from 'react';
import api from '@nb/common/server/axios';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Select } from '@nb/common/ui/select.component';
import { Modal } from '@nb/common/ui/modal.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';

type Category = { categoryId: string; title: string };
type CreateForm = { title: string; slug: string; content: string; categoryId: string };
const EMPTY_FORM: CreateForm = { title: '', slug: '', content: '', categoryId: '' };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface Props {
  open: boolean;
  tenantId: string;
  categories: Category[];
  onClose: () => void;
  onCreated: (postId: string) => void;
}

export function BlogPostCreateModal({ open, tenantId, categories, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const catOptions = [
    { value: '', label: 'No category' },
    ...categories.map((c) => ({ value: c.categoryId, label: c.title })),
  ];

  function handleClose() {
    setForm(EMPTY_FORM);
    setFormError('');
    onClose();
  }

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/blog/posts`, {
        title: form.title,
        slug: form.slug || slugify(form.title),
        content: form.content || ' ',
        categoryId: form.categoryId || undefined,
        status: 'DRAFT',
      });
      setForm(EMPTY_FORM);
      onClose();
      onCreated(res.data.post.postId);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setFormError(e?.response?.data?.message ?? e?.message ?? 'Failed to create post.');
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Post"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} loading={saving}>Create &amp; Edit</Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError && <AlertBanner variant="error" message={formError} />}
        <Input id="post-title" label="Title" required value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))} />
        <Input id="post-slug" label="Slug" required value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          hint="URL-friendly identifier, e.g. hello-world" />
        <Select id="post-cat" label="Category" options={catOptions}
          value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} />
      </div>
    </Modal>
  );
}
