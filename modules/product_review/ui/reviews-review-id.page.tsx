'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { ReviewStatusBadge, type ReviewStatus } from '@kuraykaraaslan/product_review/ui/review-status-badge.component';
import { ReviewVotesPanel } from '@kuraykaraaslan/product_review/ui/review-votes-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCheck, faBan, faFlag } from '@fortawesome/free-solid-svg-icons';

type Review = {
  productReviewId: string;
  productId: string;
  userId?: string | null;
  authorName?: string | null;
  rating: number;
  title?: string | null;
  body: string;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  orderId?: string | null;
  createdAt: string;
};

type Form = { rating: string; title: string; body: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const TRANSITIONS: { action: string; label: string; from: ReviewStatus[]; icon: typeof faCheck }[] = [
  { action: 'approve', label: 'Approve', from: ['PENDING', 'REJECTED', 'SPAM'], icon: faCheck },
  { action: 'reject', label: 'Reject', from: ['PENDING', 'APPROVED', 'SPAM'], icon: faBan },
  { action: 'spam', label: 'Mark Spam', from: ['PENDING', 'APPROVED', 'REJECTED'], icon: faFlag },
];

export default function ReviewDetailPage({ params }: { params: Promise<{ tenantId: string; reviewId: string }> }) {
  const { tenantId, reviewId } = use(params);

  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [working, setWorking] = useState(false);

  const [form, setForm] = useState<Form>({ rating: '5', title: '', body: '' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/reviews/${reviewId}`);
      const r: Review = res.data.item;
      setReview(r);
      setForm({ rating: String(r.rating), title: r.title ?? '', body: r.body });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load review.'));
    } finally { setLoading(false); }
  }, [tenantId, reviewId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/reviews/${reviewId}`, {
        rating: Number(form.rating) || 5,
        title: form.title || undefined,
        body: form.body,
      });
      toast.success('Review saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function runTransition(action: string) {
    setWorking(true);
    try {
      await api.post(`/tenant/${tenantId}/api/reviews/${reviewId}/${action}`, {});
      toast.success(`Review ${action === 'spam' ? 'marked as spam' : `${action}d`}`);
      load();
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action}.`));
    } finally { setWorking(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!review) return null;

  const availableActions = TRANSITIONS.filter((t) => t.from.includes(review.status)).map((t) => ({
    label: <><FontAwesomeIcon icon={t.icon} /> {t.label}</>,
    onClick: () => runTransition(t.action),
    disabled: working,
  }));

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Review Content</h3>
            <Input id="rv-rating" label="Rating (1-5)" type="number" required value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} />
            <Input id="rv-title" label="Title" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input id="rv-body" label="Body" required value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Metadata</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Status</span>
              <ReviewStatusBadge status={review.status} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Verified purchase</span>
              <Badge variant={review.isVerifiedPurchase ? 'success' : 'neutral'} size="sm">
                {review.isVerifiedPurchase ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Helpful votes</span>
              <span className="tabular-nums font-semibold text-text-primary">{review.helpfulCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Product</span>
              <span className="font-mono text-xs text-text-secondary">{review.productId.slice(0, 8)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Author</span>
              <span className="text-text-secondary">{review.authorName || 'Anonymous'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Created</span>
              <span className="text-text-secondary">{new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'votes', label: `Votes (${review.helpfulCount})`,
      content: <ReviewVotesPanel tenantId={tenantId} reviewId={reviewId} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Reviews', href: `/tenant/${tenantId}/admin/reviews` },
        { label: review.title || `Review ${reviewId.slice(0, 8)}` },
      ]} />

      <PageHeader
        title={review.title || `Review ${reviewId.slice(0, 8)}`}
        subtitle={`${review.rating}/5 · ${review.helpfulCount} helpful`}
        badge={<ReviewStatusBadge status={review.status} />}
        actions={[
          ...availableActions,
          { label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving },
        ]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
