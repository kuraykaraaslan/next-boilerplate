'use client';
import { useCallback, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';

const SPEC_TYPE_OPTIONS = [
  { value: 'TEXT',        label: 'Text'        },
  { value: 'NUMBER',      label: 'Number'      },
  { value: 'BOOLEAN',     label: 'Boolean'     },
  { value: 'SELECT',      label: 'Select'      },
  { value: 'MULTISELECT', label: 'Multi-Select' },
  { value: 'DATE',        label: 'Date'        },
  { value: 'COLOR',       label: 'Color'       },
];

type SpecForm = {
  key: string; label: string; type: string; unit: string;
  isRequired: boolean; isFilterable: boolean; sortOrder: string;
};
const EMPTY_SPEC: SpecForm = { key: '', label: '', type: 'TEXT', unit: '', isRequired: false, isFilterable: true, sortOrder: '0' };

interface Props {
  open: boolean;
  tenantId: string;
  categoryId: string;
  onClose(): void;
  onAdded(): void;
}

export function CategorySpecAddModal({ open, tenantId, categoryId, onClose, onAdded }: Props) {
  const [form, setForm] = useState<SpecForm>(EMPTY_SPEC);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleClose() {
    setForm(EMPTY_SPEC);
    setError('');
    onClose();
  }

  const handleAdd = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/tenant/${tenantId}/api/store/categories/${categoryId}/specs`, {
        key: form.key,
        label: form.label,
        type: form.type,
        unit: form.unit || undefined,
        isRequired: form.isRequired,
        isFilterable: form.isFilterable,
        sortOrder: Number(form.sortOrder),
      });
      toast.success('Spec added');
      setForm(EMPTY_SPEC);
      setError('');
      onClose();
      onAdded();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to add spec.');
    } finally {
      setSaving(false);
    }
  }, [tenantId, categoryId, form, onClose, onAdded]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Spec"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleAdd} loading={saving}>Add</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}
        <Input id="spec-label" label="Label" required value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value, key: f.key || e.target.value.toLowerCase().replace(/\s+/g, '_') }))} />
        <Input id="spec-key" label="Key" required value={form.key}
          onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
          hint="Lowercase snake_case, e.g. screen_size" />
        <Select id="spec-type" label="Type" options={SPEC_TYPE_OPTIONS} value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
        <Input id="spec-unit" label="Unit (optional)" value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          hint="e.g. kg, cm, W" />
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} />
            Required
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input type="checkbox" checked={form.isFilterable} onChange={(e) => setForm((f) => ({ ...f, isFilterable: e.target.checked }))} />
            Filterable
          </label>
        </div>
      </div>
    </Modal>
  );
}
