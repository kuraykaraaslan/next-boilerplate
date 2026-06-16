'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { Breadcrumb } from '@nb/common/ui/breadcrumb.component';
import { Input } from '@nb/common/ui/input.component';
import { Select } from '@nb/common/ui/select.component';
import { Card } from '@nb/common/ui/card.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { TabGroup } from '@nb/common/ui/tab-group.component';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/server-data-table.component';
import { RowActionsMenu } from '@nb/common/ui/row-actions-menu.component';
import { Spinner } from '@nb/common/ui/spinner.component';
import { toast } from '@nb/common/ui/toast.store';
import { CommentStatusBadge, type PostStatus, type CommentStatus } from '@nb/blog/ui/blog-status-badge.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTrash, faCheck, faBan, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

type Category = { categoryId: string; title: string };
type Post = {
  postId: string; title: string; slug: string; content: string; description?: string | null;
  categoryId?: string | null; status: PostStatus; views: number; keywords?: string[] | null;
};
type Comment = {
  commentId: string; content: string; name?: string | null; email?: string | null;
  userId?: string | null; status: CommentStatus; createdAt: string;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function BlogPostDetailPage({ params }: { params: Promise<{ tenantId: string; postId: string }> }) {
  const { tenantId, postId } = use(params);

  const [post, setPost]         = useState<Post | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading]   = useState(true);

  const [form, setForm] = useState({ title: '', slug: '', content: '', description: '', categoryId: '', status: 'DRAFT' as PostStatus, keywords: '' });
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [postRes, catRes, commentRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/blog/posts/${postId}`),
        api.get(`/tenant/${tenantId}/api/blog/categories`, { params: { page: 0, pageSize: 100 } }),
        api.get(`/tenant/${tenantId}/api/blog/posts/${postId}/comments`, { params: { page: 0, pageSize: 100 } }),
      ]);
      const p: Post = postRes.data.post;
      setPost(p);
      setForm({
        title: p.title, slug: p.slug, content: p.content, description: p.description ?? '',
        categoryId: p.categoryId ?? '', status: p.status, keywords: (p.keywords ?? []).join(', '),
      });
      setCategories(catRes.data.data ?? []);
      setComments(commentRes.data.data ?? []);
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load post.'));
    } finally { setLoading(false); }
  }, [tenantId, postId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/blog/posts/${postId}`, {
        title: form.title,
        slug: form.slug,
        content: form.content,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        status: form.status,
        keywords: form.keywords ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
      });
      toast.success('Post saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function moderate(comment: Comment, status: CommentStatus) {
    try {
      await api.patch(`/tenant/${tenantId}/api/blog/comments/${comment.commentId}`, { status });
      toast.success('Comment updated');
      load();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to update comment.'));
    }
  }

  async function deleteComment(comment: Comment) {
    if (!confirm('Delete this comment?')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/blog/comments/${comment.commentId}`);
      toast.success('Comment deleted');
      load();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete comment.'));
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!post) return null;

  const catOptions = [
    { value: '', label: 'No category' },
    ...categories.map((c) => ({ value: c.categoryId, label: c.title })),
  ];

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary">Content</h2>
            <Input id="post-title" label="Title" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input id="post-slug" label="Slug" required value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            <Input id="post-desc" label="Description" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="space-y-1.5">
              <label htmlFor="post-content" className="block text-sm font-medium text-text-primary">Body</label>
              <textarea
                id="post-content"
                className="w-full min-h-64 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
            <Select id="post-status" label="Status"
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PostStatus }))} />
            <Select id="post-cat" label="Category" options={catOptions}
              value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} />
            <Input id="post-keywords" label="Keywords" value={form.keywords}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              hint="Comma-separated" />
            <p className="text-xs text-text-secondary tabular-nums">{post.views} views</p>
          </div>
        </Card>
      </div>
    </div>
  );

  const commentColumns: TableColumn<Comment>[] = [
    {
      key: 'content', header: 'Comment',
      render: (c) => (
        <div>
          <p className="text-text-primary line-clamp-2">{c.content}</p>
          <p className="text-xs text-text-secondary">{c.name ?? c.userId ?? 'Anonymous'}{c.email ? ` · ${c.email}` : ''}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (c) => <CommentStatusBadge status={c.status} /> },
    {
      key: 'createdAt', header: 'Date',
      render: (c) => <span className="text-text-secondary">{new Date(c.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            ...(c.status !== 'PUBLISHED' ? [{ label: 'Approve', icon: <FontAwesomeIcon icon={faCheck} />, onClick: () => moderate(c, 'PUBLISHED' as CommentStatus) }] : []),
            ...(c.status !== 'NOT_PUBLISHED' ? [{ label: 'Unpublish', icon: <FontAwesomeIcon icon={faEyeSlash} />, onClick: () => moderate(c, 'NOT_PUBLISHED' as CommentStatus) }] : []),
            ...(c.status !== 'SPAM' ? [{ label: 'Mark spam', icon: <FontAwesomeIcon icon={faBan} />, onClick: () => moderate(c, 'SPAM' as CommentStatus) }] : []),
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger' as const, onClick: () => deleteComment(c) },
          ]} />
        </div>
      ),
    },
  ];

  const commentsContent = (
    <ServerDataTable
      columns={commentColumns}
      rows={comments}
      getRowKey={(c) => c.commentId}
      page={1} totalPages={1} total={comments.length} pageSize={comments.length || 1}
      onPageChange={() => {}}
      loading={false}
      emptyMessage="No comments on this post yet."
    />
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Posts', href: `/tenant/${tenantId}/admin/blog/posts` },
        { label: post.title },
      ]} />

      <PageHeader
        title={post.title}
        subtitle={post.slug}
        actions={[{ label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving }]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={[
        { id: 'general', label: 'General', content: generalContent },
        { id: 'comments', label: `Comments (${comments.length})`, content: commentsContent },
      ]} />
    </div>
  );
}
