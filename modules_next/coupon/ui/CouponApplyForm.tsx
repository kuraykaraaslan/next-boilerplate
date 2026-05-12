'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/modules_next/common/ui/Button';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import api from '@/libs/axios';

type ValidationResult = {
  valid: boolean;
  discountAmount?: number;
  finalAmount?: number;
  message?: string;
  coupon?: {
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
    currency?: string | null;
  };
};

type CouponApplyFormProps = {
  tenantId: string;
  amount: number;
  currency: string;
  planId?: string;
  provider?: string;
  onApplied: (result: { discountAmount: number; finalAmount: number; code: string }) => void;
  onRemoved: () => void;
};

export function CouponApplyForm({
  tenantId,
  amount,
  currency,
  planId,
  provider,
  onApplied,
  onRemoved,
}: CouponApplyFormProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/tenant/${tenantId}/api/coupons/validate`, {
        code: code.trim().toUpperCase(),
        amount,
        currency,
        planId,
        provider,
      });

      if (res.data.valid) {
        setApplied(res.data);
        onApplied({
          discountAmount: res.data.discountAmount,
          finalAmount: res.data.finalAmount,
          code: code.trim().toUpperCase(),
        });
      } else {
        setError(res.data.message ?? 'Invalid coupon code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to validate coupon.');
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    setApplied(null);
    setCode('');
    setError(null);
    onRemoved();
  }

  if (applied?.valid && applied.coupon) {
    const c = applied.coupon;
    const discountLabel =
      c.discountType === 'PERCENTAGE'
        ? `${c.discountValue}% off`
        : `${c.discountValue} ${c.currency ?? currency} off`;

    return (
      <div className="flex items-center justify-between rounded-lg border border-success/40 bg-success/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
            <FontAwesomeIcon icon={faCheck} className="text-success text-sm" />
          </div>
          <div>
            <p className="text-sm font-semibold font-mono">{c.code}</p>
            <p className="text-xs text-base-content/60">
              {c.name} — {discountLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-success font-medium">
            -{applied.discountAmount?.toFixed(2)} {currency}
          </p>
          <button
            type="button"
            onClick={handleRemove}
            className="text-base-content/40 hover:text-error transition-colors"
            aria-label="Remove coupon"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FontAwesomeIcon
            icon={faTag}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-sm pointer-events-none"
          />
          <input
            type="text"
            placeholder="Promo code"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
            className="input input-bordered w-full pl-9 font-mono uppercase"
            disabled={loading}
            aria-label="Promo code"
          />
        </div>
        <Button type="submit" variant="outline" disabled={loading || !code.trim()}>
          {loading ? <Spinner size="sm" /> : 'Apply'}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-error flex items-center gap-1">
          <FontAwesomeIcon icon={faXmark} />
          {error}
        </p>
      )}
    </form>
  );
}
