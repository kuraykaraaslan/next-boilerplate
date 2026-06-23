'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { NavigationItemsPanel } from '@kuraykaraaslan/navigation/ui/navigation-items-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';

type Menu = {
  menuId: string;
  name: string;
  slug: string;
  location: string;
};

type Form = { name: string; slug: string; location: string };

const LOCATION_OPTIONS = [
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
  { value: 'sidebar', label: 'Sidebar' },
];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function NavigationMenuPage({ params }: { params: Promise<{ tenantId: string; menuId: string }> }) {
  const { tenantId, menuId } = use(params);

  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState<Form>({ name: '', slug: '', location: 'header' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/navigation/menus/${menuId}`);
      const m: Menu = res.data.item;
      setMenu(m);
      setForm({ name: m.name, slug: m.slug, location: m.location || 'header' });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load menu.'));
    } finally { setLoading(false); }
  }, [tenantId, menuId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/navigation/menus/${menuId}`, {
        name: form.name,
        slug: form.slug,
        location: form.location || undefined,
      });
      toast.success('Menu saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!menu) return null;

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">General</h3>
            <Input id="m-name" label="Name" required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input id="m-slug" label="Slug" required value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              hint="URL-friendly identifier, e.g. main-menu" />
            <Select id="m-location" label="Location" options={LOCATION_OPTIONS}
              value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Slug</span>
              <span className="text-text-primary">{menu.slug}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Location</span>
              <span className="text-text-primary capitalize">{menu.location}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'items', label: 'Items',
      content: <NavigationItemsPanel tenantId={tenantId} menuId={menuId} onRefresh={load} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Navigation Menus', href: `/tenant/${tenantId}/admin/navigation` },
        { label: menu.name },
      ]} />

      <PageHeader
        title={menu.name}
        subtitle={menu.slug}
        actions={[
          { label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving },
        ]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
