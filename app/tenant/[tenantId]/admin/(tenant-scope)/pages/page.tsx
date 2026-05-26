'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/modules_next/common/axios';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { Badge } from '@/modules_next/common/ui/Badge';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash, faEye } from '@fortawesome/free-solid-svg-icons';

type DynamicPage = {
  dynamicPageId: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  updatedAt: string;
};

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'neutral'> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'neutral',
};

const PAGE_SIZE = 20;


function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function DynamicPagesListPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [pages, setPages] = useState<DynamicPage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPages = useCallback(async (p: number, q: string, st: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/dynamic-pages`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined, status: st || undefined },
      });
      setPages(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load pages.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { setPage(1); fetchPages(1, search, status); }, [status]);
  useEffect(() => { fetchPages(page, search, status); }, [page]);

  function handleSearch(v: string) { setSearch(v); setPage(1); fetchPages(1, v, status); }

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/dynamic-pages`, {
        title: form.title,
        slug: form.slug,
        status: 'DRAFT',
        sections: [],
      });
      toast.success('Page created');
      setShowCreate(false);
      setForm({ title: '', slug: '' });
      router.push(`/tenant/${tenantId}/admin/pages/${res.data.page.dynamicPageId}`);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create page.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(pageId: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/dynamic-pages/${pageId}`);
      toast.success('Page deleted');
      fetchPages(page, search, status);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete page.'));
    }
  }

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' },
  ];

  const columns: TableColumn<DynamicPage>[] = [
    {
      key: 'title', header: 'Page',
      render: (p) => (
        <div>
          <p className="font-medium text-text-primary">{p.title || <span className="italic text-text-secondary">Untitled</span>}</p>
          <p className="text-xs text-text-secondary">/{p.slug}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (p) => <Badge variant={STATUS_COLORS[p.status] ?? 'neutral'}>{p.status}</Badge>,
    },
    {
      key: 'updatedAt', header: 'Last updated',
      render: (p) => <span className="text-text-secondary text-sm">{new Date(p.updatedAt).toLocaleDateString()}</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            {
              label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />,
              onClick: () => router.push(`/tenant/${tenantId}/admin/pages/${p.dynamicPageId}`),
            },
            {
              label: 'Preview', icon: <FontAwesomeIcon icon={faEye} />,
              onClick: () => window.open(`/tenant/${tenantId}/p/${p.slug}`, '_blank'),
            },
            {
              label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger',
              onClick: () => handleDelete(p.dynamicPageId, p.title),
            },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic Pages"
        subtitle={loading ? '…' : `${total} page${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Page</>, onClick: () => setShowCreate(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pages}
        getRowKey={(p) => p.dynamicPageId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/tenant/${tenantId}/admin/pages/${p.dynamicPageId}`)}
        loading={loading}
        emptyMessage="No pages yet. Create your first page."
        toolbar={
          <div className="flex flex-wrap gap-3 pb-4">
            <div className="flex-1 min-w-48">
              <Input
                id="pages-search" label="Search"
                placeholder="Search pages…"
                prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="min-w-44">
              <Select id="pages-status" label="Status" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
          </div>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm({ title: '', slug: '' }); setFormError(''); }}
        title="New Page"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving} disabled={!form.title}>Create &amp; Edit</Button>
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
    </div>
  );
}
