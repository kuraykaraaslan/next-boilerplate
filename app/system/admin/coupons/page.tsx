'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { EmptyState } from '@/modules_next/common/ui/EmptyState';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTag,
  faTrash,
  faPercent,
  faDollarSign,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/libs/axios';

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

const statusVariant = (s: CouponStatus): 'success' | 'warning' | 'error' | 'neutral' => {
  if (s === 'ACTIVE') return 'success';
  if (s === 'INACTIVE') return 'warning';
  if (s === 'EXPIRED') return 'error';
  return 'neutral';
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [archiving, setArchiving] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/system/api/coupons?pageSize=100');
      setCoupons(res.data.coupons ?? []);
    } catch {
      setError('Failed to load coupons.');
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
    setCreateError(null);
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
      fetchCoupons();
    } catch (err: any) {
      setCreateError(err.response?.data?.message ?? 'Failed to create coupon.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(couponId: string) {
    setArchiving(couponId);
    try {
      await api.delete(`/system/api/coupons/${couponId}`);
      fetchCoupons();
    } catch {
      setError('Failed to archive coupon.');
    } finally {
      setArchiving(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        subtitle="Create and manage discount codes for subscription plans."
        actions={[
          {
            label: (
              <>
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                New Coupon
              </>
            ),
            onClick: () => setCreateOpen(true),
            variant: 'primary',
          },
        ]}
      />

      {error && <AlertBanner variant="error" message={error} />}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={<FontAwesomeIcon icon={faTag} />}
          title="No coupons yet"
          description="Create your first discount coupon to start offering promotions."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              New Coupon
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {coupons.map((coupon) => (
            <Card key={coupon.couponId} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FontAwesomeIcon
                      icon={coupon.discountType === 'PERCENTAGE' ? faPercent : faDollarSign}
                      className="text-primary text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold tracking-wide">{coupon.code}</span>
                      <Badge variant={statusVariant(coupon.status)} size="sm">
                        {coupon.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-base-content/60">{coupon.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {coupon.discountType === 'PERCENTAGE'
                        ? `${coupon.discountValue}%`
                        : `${coupon.discountValue} ${coupon.currency ?? ''}`}
                    </p>
                    <p className="text-xs text-base-content/50">
                      {coupon.usedCount}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : ''} uses
                    </p>
                  </div>
                  {coupon.expiresAt && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-base-content/50">Expires</p>
                      <p className="text-sm">{new Date(coupon.expiresAt).toLocaleDateString()}</p>
                    </div>
                  )}
                  {coupon.status !== 'ARCHIVED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchive(coupon.couponId)}
                      disabled={archiving === coupon.couponId}
                    >
                      {archiving === coupon.couponId
                        ? <Spinner size="sm" />
                        : <FontAwesomeIcon icon={faTrash} className="text-error" />}
                    </Button>
                  )}
                </div>
              </div>

              {(coupon.minimumAmount || coupon.maxUsesPerTenant) && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-base-content/50 border-t pt-3">
                  {coupon.minimumAmount && (
                    <span>Min. amount: {coupon.minimumAmount} {coupon.currency ?? ''}</span>
                  )}
                  {coupon.maxUsesPerTenant && (
                    <span>Max {coupon.maxUsesPerTenant}× per tenant</span>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); setCreateError(null); }}
        title="New Coupon"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="coupon-form" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Create'}
            </Button>
          </div>
        }
      >
        {createError && <AlertBanner variant="error" message={createError} className="mb-4" />}
        <form id="coupon-form" onSubmit={handleCreate} className="space-y-4">
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
                { value: 'PERCENTAGE', label: 'Percentage (%)' },
                { value: 'FIXED_AMOUNT', label: 'Fixed Amount' },
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
    </div>
  );
}
