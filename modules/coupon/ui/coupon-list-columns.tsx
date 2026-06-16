'use client';

import { Badge } from '@nb/common/ui/Badge';
import { RowActionsMenu } from '@nb/common/ui/RowActionsMenu';
import type { TableColumn } from '@nb/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPercent, faDollarSign, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import type { CouponStatus } from '@nb/coupon/server/coupon.enums';
import type { CouponScope } from '@nb/coupon/server/coupon.dto';
import type { Coupon as CanonicalCoupon } from '@nb/coupon/server/coupon.types';

export type CouponRow = Pick<
  CanonicalCoupon,
  'couponId' | 'code' | 'name' | 'discountType' | 'discountValue' | 'currency' | 'scope' | 'maxUses' | 'usedCount' | 'status'
> & { expiresAt: string | null; createdAt: string };

const statusVariant: Record<CouponStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success', INACTIVE: 'warning', EXPIRED: 'error', ARCHIVED: 'neutral',
};

function scopeSummary(scope: CouponScope | null | undefined): string {
  if (!scope) return 'All sales';
  const parts: string[] = [];
  if (scope.productIds?.length)  parts.push(`${scope.productIds.length} product${scope.productIds.length === 1 ? '' : 's'}`);
  if (scope.planIds?.length)     parts.push(`${scope.planIds.length} plan${scope.planIds.length === 1 ? '' : 's'}`);
  if (scope.providers?.length)   parts.push(`${scope.providers.length} provider${scope.providers.length === 1 ? '' : 's'}`);
  if (scope.appliesTo === 'cart') parts.push('cart-level');
  if (scope.minimumAmount && scope.minimumAmount > 0) parts.push(`min ${scope.minimumAmount}`);
  return parts.length > 0 ? parts.join(' · ') : 'All sales';
}

type Handlers = {
  onEdit: (c: CouponRow) => void;
  onArchive: (c: CouponRow) => void;
};

export function buildCouponColumns(h: Handlers): TableColumn<CouponRow>[] {
  return [
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
          {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `${c.discountValue} ${c.currency ?? ''}`}
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
      key: 'scope',
      header: 'Scope',
      render: (c) => (
        <span className="text-xs text-text-secondary truncate max-w-[200px] inline-block align-middle">
          {scopeSummary(c.scope)}
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
      render: (c) => <Badge variant={statusVariant[c.status]} dot>{c.status}</Badge>,
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => h.onEdit(c) },
              {
                label: c.status === 'ARCHIVED' ? 'Archived' : 'Archive',
                icon: <FontAwesomeIcon icon={faTrash} />,
                onClick: () => h.onArchive(c),
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
    },
  ];
}
