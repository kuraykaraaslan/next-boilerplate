'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@nb/common/server/axios';
import { ServerDataTable } from '@nb/common/ui/server-data-table.component';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Select } from '@nb/common/ui/select.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { toast } from '@nb/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faBars, faWindowMinimize } from '@fortawesome/free-solid-svg-icons';
import {
  buildDynamicPageColumns,
  type DynamicPage,
} from '@nb/dynamic_page/ui/dynamic-page-columns.component';
import { DynamicPageCreateModal } from '@nb/dynamic_page/ui/dynamic-page-create-modal.component';

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
  const [systemPages, setSystemPages] = useState<{ nav?: DynamicPage; footer?: DynamicPage }>({});
  const [systemLoading, setSystemLoading] = useState(true);
  const [creatingSystem, setCreatingSystem] = useState<'__nav' | '__footer' | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPages = useCallback(async (p: number, q: string, st: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/dynamic-pages`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined, status: st || undefined },
      });
      const items: DynamicPage[] = res.data.items ?? [];
      setPages(items.filter((item) => !item.slug.startsWith('__')));
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load pages.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  const fetchSystemPages = useCallback(async () => {
    setSystemLoading(true);
    try {
      const res = await api.get(`/tenant/${tenantId}/api/dynamic-pages`, {
        params: { page: 0, pageSize: 10, search: '__' },
      });
      const items: DynamicPage[] = res.data.items ?? [];
      setSystemPages({
        nav: items.find((p) => p.slug === '__nav'),
        footer: items.find((p) => p.slug === '__footer'),
      });
    } catch { /* silent */ }
    finally { setSystemLoading(false); }
  }, [tenantId]);

  useEffect(() => { setPage(1); fetchPages(1, search, status); }, [status]);
  useEffect(() => { fetchPages(page, search, status); }, [page]);
  useEffect(() => { fetchSystemPages(); }, [fetchSystemPages]);

  async function handleCreateSystem(slug: '__nav' | '__footer') {
    setCreatingSystem(slug);
    try {
      const title = slug === '__nav' ? 'Site Navigation' : 'Site Footer';
      const res = await api.post(`/tenant/${tenantId}/api/dynamic-pages`, {
        title, slug, status: 'PUBLISHED', sections: [],
      });
      toast.success(`${title} created`);
      router.push(`/tenant/${tenantId}/admin/pages/${res.data.page.dynamicPageId}`);
    } catch (err) {
      toast.error(extractMessage(err, `Failed to create ${slug}.`));
    } finally { setCreatingSystem(null); }
  }

  function handleSearch(v: string) { setSearch(v); setPage(1); fetchPages(1, v, status); }

  async function handleDelete(p: DynamicPage) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/dynamic-pages/${p.dynamicPageId}`);
      toast.success('Page deleted');
      fetchPages(page, search, status);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete page.'));
    }
  }

  const columns = buildDynamicPageColumns({
    onEdit:    (p) => router.push(`/tenant/${tenantId}/admin/pages/${p.dynamicPageId}`),
    onPreview: (p) => window.open(`/tenant/${tenantId}/${p.slug}`, '_blank'),
    onDelete:  handleDelete,
  });

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' },
  ];

  function renderSystemCard(slug: '__nav' | '__footer', label: string, icon: typeof faBars) {
    const existing = slug === '__nav' ? systemPages.nav : systemPages.footer;
    return (
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface-raised">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-subtle text-primary">
          <FontAwesomeIcon icon={icon} className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary">{label}</p>
          <p className="text-xs text-text-secondary">
            {existing
              ? <>Slug: <code className="font-mono">/{existing.slug}</code> · {existing.status}</>
              : `Not yet created — site will render without ${slug === '__nav' ? 'navigation' : 'footer'}.`}
          </p>
        </div>
        {existing ? (
          <Button variant="secondary" onClick={() => router.push(`/tenant/${tenantId}/admin/pages/${existing.dynamicPageId}`)}>
            <FontAwesomeIcon icon={faPenToSquare} /> Edit
          </Button>
        ) : (
          <Button variant="primary" loading={creatingSystem === slug} onClick={() => handleCreateSystem(slug)}>
            <FontAwesomeIcon icon={faPlus} /> Create
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic Pages"
        subtitle={loading ? '…' : `${total} page${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Page</>, onClick: () => setShowCreate(true) }]}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Site Layout</h2>
          <p className="text-xs text-text-secondary">Shared navigation and footer rendered around every public page.</p>
        </div>
        {systemLoading ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {renderSystemCard('__nav', 'Navigation', faBars)}
            {renderSystemCard('__footer', 'Footer', faWindowMinimize)}
          </div>
        )}
      </section>

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pages}
        getRowKey={(p) => p.dynamicPageId}
        page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/tenant/${tenantId}/admin/pages/${p.dynamicPageId}`)}
        loading={loading}
        emptyMessage="No pages yet. Create your first page."
        toolbar={
          <div className="flex flex-wrap gap-3 pb-4">
            <div className="flex-1 min-w-48">
              <Input
                id="pages-search" label="Search" placeholder="Search pages…"
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

      <DynamicPageCreateModal
        open={showCreate}
        tenantId={tenantId}
        onClose={() => setShowCreate(false)}
        onCreated={(pageId) => router.push(`/tenant/${tenantId}/admin/pages/${pageId}`)}
      />
    </div>
  );
}
