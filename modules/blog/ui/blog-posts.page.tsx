'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { PostStatusBadge, type PostStatus } from '@kuraykaraaslan/blog/ui/blog-status-badge.component';
import { BlogPostCreateModal } from '@kuraykaraaslan/blog/ui/blog-post-create-modal.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

type Post = {
  postId: string;
  title: string;
  slug: string;
  status: PostStatus;
  views: number;
  publishedAt?: string | null;
  createdAt: string;
};
type Category = { categoryId: string; title: string };

const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function BlogPostsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [posts, setPosts]       = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPosts = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/blog/posts`, {
        params: { page: p - 1, pageSize: PAGE_SIZE },
      });
      setPosts(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load posts.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get(`/tenant/${tenantId}/api/blog/categories`, { params: { page: 0, pageSize: 100 } });
      setCategories(res.data.data ?? []);
    } catch { /* non-fatal — category select just stays empty */ }
  }, [tenantId]);

  useEffect(() => { fetchPosts(page); }, [page, fetchPosts]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const displayed = search
    ? posts.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase()))
    : posts;

  async function setStatus(post: Post, status: PostStatus) {
    try {
      await api.patch(`/tenant/${tenantId}/api/blog/posts/${post.postId}`, { status });
      toast.success(status === 'PUBLISHED' ? 'Post published' : 'Post unpublished');
      fetchPosts(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to update post.'));
    }
  }

  async function handleDelete(post: Post) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/blog/posts/${post.postId}`);
      toast.success('Post deleted');
      fetchPosts(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete post.'));
    }
  }

  const columns: TableColumn<Post>[] = [
    {
      key: 'title', header: 'Title',
      render: (p) => (
        <div>
          <p className="font-medium text-text-primary">{p.title}</p>
          <p className="text-xs text-text-secondary">{p.slug}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (p) => <PostStatusBadge status={p.status} size="sm" dot /> },
    { key: 'views', header: 'Views', render: (p) => <span className="tabular-nums text-text-secondary">{p.views}</span> },
    {
      key: 'createdAt', header: 'Created',
      render: (p) => <span className="text-text-secondary">{new Date(p.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => router.push(`/tenant/${tenantId}/admin/blog/posts/${p.postId}`) },
            p.status === 'PUBLISHED'
              ? { label: 'Unpublish', icon: <FontAwesomeIcon icon={faEyeSlash} />, onClick: () => setStatus(p, 'DRAFT') }
              : { label: 'Publish', icon: <FontAwesomeIcon icon={faEye} />, onClick: () => setStatus(p, 'PUBLISHED') },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(p) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posts"
        subtitle={loading ? '…' : `${total} post${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Post</>, onClick: () => setShowCreate(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={displayed}
        getRowKey={(p) => p.postId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/tenant/${tenantId}/admin/blog/posts/${p.postId}`)}
        loading={loading}
        emptyMessage="No posts yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="post-search"
              label="Search"
              placeholder="Filter by title or slug…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <BlogPostCreateModal
        open={showCreate}
        tenantId={tenantId}
        categories={categories}
        onClose={() => setShowCreate(false)}
        onCreated={(postId) => router.push(`/tenant/${tenantId}/admin/blog/posts/${postId}`)}
      />
    </div>
  );
}
