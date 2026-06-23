'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash, faGear } from '@fortawesome/free-solid-svg-icons';

type Menu = {
  menuId: string;
  name: string;
  slug: string;
  location: string;
  createdAt: string;
};

type MenuForm = { name: string; slug: string; location: string };
const EMPTY_FORM: MenuForm = { name: '', slug: '', location: 'header' };
const LOCATION_OPTIONS = [
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
  { value: 'sidebar', label: 'Sidebar' },
];

const PAGE_SIZE = 50;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function NavigationMenusPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [menus, setMenus]       = useState<Menu[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<MenuForm>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchMenus = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/navigation/menus`, {
        params: { page: p - 1, pageSize: PAGE_SIZE },
      });
      setMenus(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load menus.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchMenus(page); }, [page, fetchMenus]);

  const displayed = search
    ? menus.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.slug.includes(search.toLowerCase()))
    : menus;

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(m: Menu) {
    setEditId(m.menuId);
    setForm({ name: m.name, slug: m.slug, location: m.location || 'header' });
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      location: form.location || undefined,
    };
    try {
      if (editId) {
        await api.patch(`/tenant/${tenantId}/api/navigation/menus/${editId}`, payload);
        toast.success('Menu updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/navigation/menus`, payload);
        toast.success('Menu created');
      }
      closeModal();
      fetchMenus(page);
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'Failed to save menu.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(m: Menu) {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/navigation/menus/${m.menuId}`);
      toast.success('Menu deleted');
      fetchMenus(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete menu.'));
    }
  }

  const columns: TableColumn<Menu>[] = [
    {
      key: 'name', header: 'Name',
      render: (m) => <span className="font-medium text-text-primary">{m.name}</span>,
    },
    { key: 'slug', header: 'Slug', render: (m) => <span className="text-text-secondary">{m.slug}</span> },
    { key: 'location', header: 'Location', render: (m) => <span className="text-text-secondary capitalize">{m.location}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (m) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(m) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(m) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Navigation Menus"
        subtitle={loading ? '…' : `${total} menu${total !== 1 ? 's' : ''}`}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/navigation/settings`, variant: 'ghost' as const },
          { label: <><FontAwesomeIcon icon={faPlus} /> New Menu</>, onClick: openCreate },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={displayed}
        getRowKey={(m) => m.menuId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(m) => router.push(`/tenant/${tenantId}/admin/navigation/${m.menuId}`)}
        loading={loading}
        emptyMessage="No menus yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="menu-search"
              label="Search"
              placeholder="Filter by name or slug…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editId ? 'Edit Menu' : 'New Menu'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="menu-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} />
          <Input id="menu-slug" label="Slug" required value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            hint="URL-friendly identifier, e.g. main-menu" />
          <Select id="menu-location" label="Location" options={LOCATION_OPTIONS}
            value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
