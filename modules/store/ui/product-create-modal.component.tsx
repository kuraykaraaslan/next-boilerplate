'use client';

import { useState } from 'react';
import api from '@nb/common/server/axios';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Select } from '@nb/common/ui/select.component';
import { Modal } from '@nb/common/ui/modal.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { CurrencySelector } from '@nb/common/ui/currency-selector.component';

type Category = { categoryId: string; name: string };
type CreateForm = { name: string; slug: string; categoryId: string; basePrice: string; currency: string };
const EMPTY_FORM: CreateForm = { name: '', slug: '', categoryId: '', basePrice: '0', currency: 'USD' };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface Props {
  open: boolean;
  tenantId: string;
  categories: Category[];
  onClose: () => void;
  onCreated: (productId: string) => void;
}

export function ProductCreateModal({ open, tenantId, categories, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const catOptions = [
    { value: '', label: 'Select category…' },
    ...categories.map((c) => ({ value: c.categoryId, label: c.name })),
  ];

  function handleClose() {
    setForm(EMPTY_FORM);
    setFormError('');
    onClose();
  }

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/store/products`, {
        name: form.name,
        slug: form.slug || slugify(form.name),
        categoryId: form.categoryId,
        basePrice: Number(form.basePrice),
        currency: form.currency,
        status: 'DRAFT',
      });
      setForm(EMPTY_FORM);
      onClose();
      onCreated(res.data.product.productId);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setFormError(e?.response?.data?.message ?? e?.message ?? 'Failed to create product.');
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Product"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} loading={saving}>Create &amp; Edit</Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError && <AlertBanner variant="error" message={formError} />}
        <Input id="p-name" label="Name" required value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} />
        <Input id="p-slug" label="Slug" required value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
        <Select id="p-cat" label="Category" required options={catOptions}
          value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} />
        <div className="flex gap-3">
          <div className="flex-1">
            <Input id="p-price" label="Base Price" type="number" required value={form.basePrice}
              onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
          </div>
          <div className="w-36">
            <CurrencySelector id="p-currency" label="Currency" value={form.currency}
              onChange={(cur) => setForm((f) => ({ ...f, currency: cur }))} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
