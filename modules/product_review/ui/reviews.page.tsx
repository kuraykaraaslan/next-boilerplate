'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ReviewStatusBadge } from '@kuraykaraaslan/product_review/ui/review-status-badge.component';
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
import { faPlus, faPenToSquare, faTrash, faCheck, faBan, faFlag } from '@fortawesome/free-solid-svg-icons';

type Review = {
  productReviewId: string;
  productId: string;
  authorName?: string | null;
  rating: number;
  title?: string | null;
  status: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
};

type ReviewForm = { productId: string; authorName: string; rating: string; title: string; body: string };
const EMPTY_FORM: ReviewForm = { productId: '', authorName: '', rating: '5', title: '', body: '' };

const STATUS_FILTER = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SPAM', label: 'Spam' },
];
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function ReviewsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ReviewForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number, s: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/reviews`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, status: s || undefined },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load reviews.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page, status); }, [page, status, fetchRows]);

  function openCreate() { setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }

  async function handleSave() {
    setSaving(true); setFormError('');
    try {
      await api.post(`/tenant/${tenantId}/api/reviews`, {
        productId: form.productId,
        authorName: form.authorName || undefined,
        rating: Number(form.rating) || 5,
        title: form.title || undefined,
        body: form.body,
      });
      toast.success('Review created');
      setModalOpen(false);
      fetchRows(page, status);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create review.'));
    } finally { setSaving(false); }
  }

  async function moderate(r: Review, action: 'approve' | 'reject' | 'spam') {
    try {
      await api.post(`/tenant/${tenantId}/api/reviews/${r.productReviewId}/${action}`, {});
      toast.success(`Review ${action === 'spam' ? 'marked as spam' : `${action}d`}`);
      fetchRows(page, status);
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action}.`));
    }
  }

  async function handleDelete(r: Review) {
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/reviews/${r.productReviewId}`);
      toast.success('Review deleted');
      fetchRows(page, status);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete review.'));
    }
  }

  const columns: TableColumn<Review>[] = [
    {
      key: 'title', header: 'Review',
      render: (r) => (
        <div className="min-w-0">
          <span className="font-medium text-text-primary">{r.title || '(no title)'}</span>
          <span className="block text-xs text-text-secondary truncate">{r.authorName || 'Anonymous'} · product {r.productId.slice(0, 8)}</span>
        </div>
      ),
    },
    { key: 'rating', header: 'Rating', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.rating}/5</span> },
    { key: 'helpfulCount', header: 'Helpful', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.helpfulCount}</span> },
    { key: 'status', header: 'Status', render: (r) => <ReviewStatusBadge status={r.status} size="sm" dot /> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Open', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => router.push(`/tenant/${tenantId}/admin/reviews/${r.productReviewId}`) },
            { label: 'Approve', icon: <FontAwesomeIcon icon={faCheck} />, onClick: () => moderate(r, 'approve') },
            { label: 'Reject', icon: <FontAwesomeIcon icon={faBan} />, onClick: () => moderate(r, 'reject') },
            { label: 'Mark spam', icon: <FontAwesomeIcon icon={faFlag} />, onClick: () => moderate(r, 'spam') },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        subtitle={loading ? '…' : `${total} review${total !== 1 ? 's' : ''}`}
        actions={[
          { label: <><FontAwesomeIcon icon={faPlus} /> New Review</>, onClick: openCreate },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.productReviewId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(r) => router.push(`/tenant/${tenantId}/admin/reviews/${r.productReviewId}`)}
        loading={loading}
        emptyMessage="No reviews to moderate."
        toolbar={
          <div className="pb-4 max-w-xs">
            <Select
              id="review-status-filter"
              label="Status"
              options={STATUS_FILTER}
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Review"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.productId || !form.body}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="rv-product" label="Product ID" required value={form.productId}
            onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} />
          <Input id="rv-author" label="Author Name" value={form.authorName}
            onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))} />
          <Input id="rv-rating" label="Rating (1-5)" type="number" required value={form.rating}
            onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} />
          <Input id="rv-title" label="Title" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input id="rv-body" label="Body" required value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
