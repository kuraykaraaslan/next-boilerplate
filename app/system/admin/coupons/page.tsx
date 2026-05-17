'use client';
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPercent, faDollarSign, faTrash } from '@fortawesome/free-solid-svg-icons';
import api from '@/modules_next/common/axios';

type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'ARCHIVED';
type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

type Coupon = {
  couponId: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  currency?: string | null;
  maxUses?: number | null;
  maxUsesPerTenant?: number | null;
  usedCount: number;
  minimumAmount?: number | null;
  status: CouponStatus;
  expiresAt?: string | null;
  createdAt: string;
};

type CreateForm = {
  code: string;
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  currency: string;
  maxUses: string;
  maxUsesPerTenant: string;
  minimumAmount: string;
  expiresAt: string;
};

const EMPTY_FORM: CreateForm = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  currency: 'USD',
  maxUses: '',
  maxUsesPerTenant: '',
  minimumAmount: '',
  expiresAt: '',
};

const PAGE_SIZE = 25;

const statusVariant: Record<CouponStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'warning',
  EXPIRED:  'error',
  ARCHIVED: 'neutral',
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function CouponsPage() {
  const [coupons, setCoupons]     = useState<Coupon[]>([]);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [createOpen, setCreateOpen]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm]               = useState<CreateForm>(EMPTY_FORM);

  const [archivingCoupon, setArchivingCoupon] = useState<Coupon | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get('/system/api/coupons?pageSize=100');
      setCoupons(res.data.coupons ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load coupons.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  function handleField(key: keyof CreateForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCreateError('');
    try {
      await api.post('/system/api/coupons', {
        code: form.code.toUpperCase(),
        name: form.name,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        currency: form.discountType === 'FIXED_AMOUNT' ? form.currency : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        maxUsesPerTenant: form.maxUsesPerTenant ? parseInt(form.maxUsesPerTenant) : undefined,
        minimumAmount: form.minimumAmount ? parseFloat(form.minimumAmount) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      toast.success('Coupon created.');
      fetchCoupons();
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create coupon.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!archivingCoupon) return;
    setArchiving(true);
    setArchiveError('');
    try {
      await api.delete(`/system/api/coupons/${archivingCoupon.couponId}`);
      setArchivingCoupon(null);
      toast.success('Coupon archived.');
      fetchCoupons();
    } catch (err: unknown) {
      setArchiveError(extractMessage(err, 'Failed to archive coupon.'));
    } finally {
      setArchiving(false);
    }
  }

  const total = coupons.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = coupons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<Coupon>[] = [
    {
      key: 'code',
      header: 'Coupon',
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={c.discountType === 'PERCENTAGE' ? faPercent : faDollarSign} />
          </span>
          <div className="min-w-0">
            <p className="font-mono font-semibold tracking-wide text-text-primary">{c.code}</p>
            <p className="text-xs text-text-secondary truncate max-w-xs">{c.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'discountValue',
      header: 'Discount',
      render: (c) => (
        <span className="font-semibold tabular-nums text-text-primary">
          {c.discountType === 'PERCENTAGE'
            ? `${c.discountValue}%`
            : `${c.discountValue} ${c.currency ?? ''}`}
        </span>
      ),
    },
    {
      key: 'usedCount',
      header: 'Usage',
      render: (c) => (
        <span className="text-text-secondary text-sm tabular-nums">
          {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (c) => (
        <span className="text-text-secondary text-sm">
          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Badge variant={statusVariant[c.status]} dot>{c.status}</Badge>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: c.status === 'ARCHIVED' ? 'Archived' : 'Archive',
                icon: <FontAwesomeIcon icon={faTrash} />,
                onClick: () => { setArchivingCoupon(c); setArchiveError(''); },
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        subtitle="Create and manage discount codes for subscription plans."
        actions={[{ label: 'New Coupon', onClick: () => setCreateOpen(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(c) => c.couponId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No coupons yet."
      />

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); setCreateError(''); }}
        title="New Coupon"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); setCreateError(''); }} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="coupon-form" loading={submitting}>Create</Button>
          </>
        }
      >
        <form id="coupon-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="coupon-code"
              label="Code"
              placeholder="SUMMER25"
              value={form.code}
              onChange={(e) => handleField('code', e.target.value.toUpperCase())}
              required
              className="font-mono uppercase"
            />
            <Input
              id="coupon-name"
              label="Name"
              placeholder="Summer sale 25%"
              value={form.name}
              onChange={(e) => handleField('name', e.target.value)}
              required
            />
          </div>

          <Input
            id="coupon-description"
            label="Description"
            placeholder="Optional description"
            value={form.description}
            onChange={(e) => handleField('description', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="coupon-discount-type"
              label="Discount Type"
              value={form.discountType}
              onChange={(e) => handleField('discountType', e.target.value as DiscountType)}
              options={[
                { value: 'PERCENTAGE',   label: 'Percentage (%)' },
                { value: 'FIXED_AMOUNT', label: 'Fixed Amount'   },
              ]}
            />
            <Input
              id="coupon-discount-value"
              label={form.discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount Amount'}
              type="number"
              min="0"
              max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
              step="0.01"
              placeholder={form.discountType === 'PERCENTAGE' ? '25' : '10.00'}
              value={form.discountValue}
              onChange={(e) => handleField('discountValue', e.target.value)}
              required
            />
          </div>

          {form.discountType === 'FIXED_AMOUNT' && (
            <Input
              id="coupon-currency"
              label="Currency"
              placeholder="USD"
              maxLength={3}
              value={form.currency}
              onChange={(e) => handleField('currency', e.target.value.toUpperCase())}
              required
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="coupon-max-uses"
              label="Max Total Uses"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={form.maxUses}
              onChange={(e) => handleField('maxUses', e.target.value)}
            />
            <Input
              id="coupon-max-uses-per-tenant"
              label="Max Uses per Tenant"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={form.maxUsesPerTenant}
              onChange={(e) => handleField('maxUsesPerTenant', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="coupon-min-amount"
              label="Minimum Amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="No minimum"
              value={form.minimumAmount}
              onChange={(e) => handleField('minimumAmount', e.target.value)}
            />
            <Input
              id="coupon-expires-at"
              label="Expires At"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => handleField('expiresAt', e.target.value)}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!archivingCoupon}
        onClose={() => { setArchivingCoupon(null); setArchiveError(''); }}
        title="Archive Coupon"
        description={`Archive coupon ${archivingCoupon?.code}? It will no longer be usable.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setArchivingCoupon(null); setArchiveError(''); }} disabled={archiving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleArchive} loading={archiving}>Archive</Button>
          </>
        }
      >
        {archiveError && <AlertBanner variant="error" message={archiveError} />}
      </Modal>
    </div>
  );
}
