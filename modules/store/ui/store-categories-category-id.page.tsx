'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { SeoPanel } from '@kuraykaraaslan/seo/ui';
import { GalleryPanel } from '@kuraykaraaslan/media_gallery/ui/gallery-panel.component';
import { CategorySpecAddModal } from '@kuraykaraaslan/store/ui/category-spec-add-modal.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';

type Category = {
  categoryId: string; name: string; slug: string; description?: string | null;
  isActive: boolean; sortOrder: number;
};

type Spec = {
  specId: string; key: string; label: string; type: string; unit?: string | null;
  isRequired: boolean; isFilterable: boolean; sortOrder: number;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function CategoryDetailPage({
  params,
}: { params: Promise<{ tenantId: string; categoryId: string }> }) {
  const { tenantId, categoryId } = use(params);

  const [category, setCategory] = useState<Category | null>(null);
  const [specs, setSpecs]       = useState<Spec[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading]   = useState(true);

  const [editForm, setEditForm] = useState<Omit<Category, 'categoryId'>>({
    name: '', slug: '', description: '', isActive: true, sortOrder: 0,
  });
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showSpec, setShowSpec] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [catRes, specRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/store/categories/${categoryId}`),
        api.get(`/tenant/${tenantId}/api/store/categories/${categoryId}/specs`),
      ]);
      const cat: Category = catRes.data.category;
      setCategory(cat);
      setEditForm({ name: cat.name, slug: cat.slug, description: cat.description ?? '', isActive: cat.isActive, sortOrder: cat.sortOrder });
      setSpecs(specRes.data.specs ?? []);
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load category.'));
    } finally { setLoading(false); }
  }, [tenantId, categoryId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.put(`/tenant/${tenantId}/api/store/categories/${categoryId}`, editForm);
      toast.success('Category saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function handleDeleteSpec(specId: string, label: string) {
    if (!confirm(`Remove spec "${label}"?`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/categories/${categoryId}/specs/${specId}`);
      toast.success('Spec removed');
      load();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to remove spec.'));
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!category) return null;

  const specColumns: TableColumn<Spec>[] = [
    { key: 'label', header: 'Label', render: (s) => <span className="font-medium">{s.label}</span> },
    { key: 'key',   header: 'Key',   render: (s) => <code className="text-xs bg-surface-raised px-1 rounded">{s.key}</code> },
    { key: 'type',  header: 'Type',  render: (s) => <Badge variant="neutral" size="sm">{s.type}</Badge> },
    { key: 'unit',  header: 'Unit',  render: (s) => <span className="text-text-secondary">{s.unit ?? '—'}</span> },
    {
      key: 'flags', header: 'Flags',
      render: (s) => (
        <div className="flex gap-1">
          {s.isRequired   && <Badge variant="warning" size="sm">Required</Badge>}
          {s.isFilterable && <Badge variant="info"    size="sm">Filterable</Badge>}
        </div>
      ),
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[{
            label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger',
            onClick: () => handleDeleteSpec(s.specId, s.label),
          }]} />
        </div>
      ),
    },
  ];

  const generalContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-semibold text-text-primary">General</h2>
              <Input id="cat-name" label="Name" required value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              <Input id="cat-slug" label="Slug" required value={editForm.slug}
                onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} />
              <Input id="cat-desc" label="Description" value={editForm.description ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
              <Select
                id="cat-active" label="Status"
                options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
                value={String(editForm.isActive)}
                onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}
              />
              <Input id="cat-order" label="Sort Order" type="number" value={String(editForm.sortOrder)}
                onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Spec Templates</h2>
          <Button variant="secondary" size="sm" onClick={() => setShowSpec(true)}>
            <FontAwesomeIcon icon={faPlus} /> Add Spec
          </Button>
        </div>
        <ServerDataTable
          columns={specColumns}
          rows={specs}
          getRowKey={(s) => s.specId}
          page={1} totalPages={1} total={specs.length} pageSize={specs.length || 1}
          onPageChange={() => {}}
          loading={false}
          emptyMessage="No specs defined. Add one to let products in this category have structured attributes."
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Categories', href: `/tenant/${tenantId}/admin/store/categories` },
        { label: category.name },
      ]} />

      <PageHeader
        title={category.name}
        subtitle={category.slug}
        actions={[{ label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving }]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={[
        { id: 'general', label: 'General', content: generalContent },
        { id: 'gallery', label: 'Gallery', content: <GalleryPanel tenantId={tenantId} entityType="store_category" entityId={categoryId} /> },
        { id: 'seo',     label: 'SEO',     content: <SeoPanel     tenantId={tenantId} entityType="store_category" entityId={categoryId} /> },
      ]} />

      <CategorySpecAddModal
        open={showSpec}
        tenantId={tenantId}
        categoryId={categoryId}
        onClose={() => setShowSpec(false)}
        onAdded={load}
      />
    </div>
  );
}
