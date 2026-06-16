'use client';
import { useState, useEffect } from 'react';
import { Spinner } from '@nb/common/ui/Spinner';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { EmptyState } from '@nb/common/ui/EmptyState';
import { CouponBadge } from './CouponBadge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag } from '@fortawesome/free-solid-svg-icons';
import api from '@nb/common/server/axios';

type Redemption = {
  redemptionId: string;
  couponCode: string;
  discountAmount: number;
  currency: string;
  originalAmount: number;
  finalAmount: number;
  appliedAt: string;
};

export function CouponRedemptionsList({ tenantId }: { tenantId: string }) {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/tenant/${tenantId}/api/coupons/redemptions`);
        setRedemptions(res.data.redemptions ?? []);
      } catch {
        setError('Failed to load redemption history.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (error) return <AlertBanner variant="error" message={error} />;
  if (redemptions.length === 0) {
    return (
      <EmptyState
        icon={<FontAwesomeIcon icon={faTag} />}
        title="No redemptions yet"
        description="Applied coupons will appear here."
      />
    );
  }

  return (
    <div className="divide-y">
      {redemptions.map((r) => (
        <div key={r.redemptionId} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <CouponBadge
              code={r.couponCode}
              discountType="FIXED_AMOUNT"
              discountValue={r.discountAmount}
              currency={r.currency}
              size="sm"
            />
            <span className="text-xs text-base-content/50">
              {new Date(r.appliedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-success">
              -{r.discountAmount.toFixed(2)} {r.currency}
            </p>
            <p className="text-xs text-base-content/40">
              {r.originalAmount.toFixed(2)} → {r.finalAmount.toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
