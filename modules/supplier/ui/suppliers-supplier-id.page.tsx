'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { SupplierContactsPanel } from '@kuraykaraaslan/supplier/ui/supplier-contacts-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';

type Supplier = {
  supplierId: string;
  name: string;
  code: string;
  categoryId?: string | null;
  email?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  isActive: boolean;
};

type CategoryOption = { categoryId: string; name: string };

type Form = {
  name: string; code: string; categoryId: string;
  email: string; phone: string; taxNumber: string; isActive: boolean;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function SuppliersSupplierIdPage({ params }: { params: Promise<{ tenantId: string; supplierId: string }> }) {
  const { tenantId, supplierId } = use(params);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState<Form>({
    name: '', code: '', categoryId: '', email: '', phone: '', taxNumber: '', isActive: false,
  });

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get(`/tenant/${tenantId}/api/suppliers/categories`, {
        params: { page: 0, pageSize: 200 },
      });
      setCategories(res.data.data ?? []);
    } catch { /* non-fatal */ }
  }, [tenantId]);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/suppliers/${supplierId}`);
      const s: Supplier = res.data.item;
      setSupplier(s);
      setForm({
        name: s.name,
        code: s.code,
        categoryId: s.categoryId ?? '',
        email: s.email ?? '',
        phone: s.phone ?? '',
        taxNumber: s.taxNumber ?? '',
        isActive: !!s.isActive,
      });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load supplier.'));
    } finally { setLoading(false); }
  }, [tenantId, supplierId]);

  useEffect(() => { load(); loadCategories(); }, [load, loadCategories]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/suppliers/${supplierId}`, {
        name: form.name,
        code: form.code,
        categoryId: form.categoryId || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        taxNumber: form.taxNumber || undefined,
        isActive: form.isActive,
      });
      toast.success('Supplier saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!supplier) return null;

  const categoryOptions = [
    { value: '', label: '— None —' },
    ...categories.map((c) => ({ value: c.categoryId, label: c.name })),
  ];

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">General</h3>
            <Input id="s-name" label="Name" required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input id="s-code" label="Code" required value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            <Select id="s-category" label="Category" options={categoryOptions} value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} />
            <div className="flex gap-3">
              <div className="flex-1">
                <Input id="s-email" label="Email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="flex-1">
                <Input id="s-phone" label="Phone" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <Input id="s-tax" label="Tax Number" value={form.taxNumber}
              onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))} />
            <Select id="s-active" label="Active"
              options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]}
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Status</span>
              <Badge variant={supplier.isActive ? 'success' : 'neutral'} size="sm" dot>
                {supplier.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Code</span>
              <span className="font-medium text-text-primary">{supplier.code}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'contacts', label: 'Contacts',
      content: <SupplierContactsPanel tenantId={tenantId} supplierId={supplierId} onRefresh={load} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Suppliers', href: `/tenant/${tenantId}/admin/suppliers` },
        { label: supplier.name },
      ]} />

      <PageHeader
        title={supplier.name}
        subtitle={supplier.code}
        badge={
          <Badge variant={supplier.isActive ? 'success' : 'neutral'} dot>
            {supplier.isActive ? 'Active' : 'Inactive'}
          </Badge>
        }
        actions={[
          { label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving },
        ]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
