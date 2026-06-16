'use client';

import { Badge } from '@nb/common/ui/badge.component';
import { RowActionsMenu } from '@nb/common/ui/row-actions-menu.component';
import type { TableColumn } from '@nb/common/ui/server-data-table.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag, faPenToSquare, faBoxOpen, faStar, faStarHalfStroke } from '@fortawesome/free-solid-svg-icons';

type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type BillingInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type PlanRow = {
  planId: string;
  productId: string;
  product: { productId: string; name: string; slug: string; currency: string; basePrice: number; shortDescription?: string | null; status: string } | null;
  interval: BillingInterval;
  trialDays: number;
  status: PlanStatus;
  createdAt: string;
  _count?: { subscriptions: number };
};

const INTERVAL_LABEL: Record<BillingInterval, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly',
};
const INTERVAL_SHORT: Record<BillingInterval, string> = {
  DAILY: 'day', WEEKLY: 'wk', MONTHLY: 'mo', QUARTERLY: 'qtr', YEARLY: 'yr',
};
const statusVariant: Record<PlanStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success', INACTIVE: 'warning', ARCHIVED: 'neutral',
};

function formatPrice(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

type Handlers = {
  defaultPlanId: string | null;
  onManage: (plan: PlanRow) => void;
  onOpenProduct: (plan: PlanRow) => void;
  onSetDefault: (planId: string | null) => void;
};

export function buildPlanColumns(h: Handlers): TableColumn<PlanRow>[] {
  return [
    {
      key: 'product',
      header: 'Plan / Product',
      render: (plan) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={faTag} className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate flex items-center gap-2">
              <span className="truncate">{plan.product?.name ?? <span className="italic text-text-disabled">No product</span>}</span>
              {plan.planId === h.defaultPlanId && <Badge variant="primary" size="sm">Default</Badge>}
            </p>
            <p className="text-xs text-text-secondary truncate max-w-[260px]">
              <code>{plan.product?.slug}</code>
              {plan.product?.shortDescription ? ` · ${plan.product.shortDescription}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'interval',
      header: 'Interval',
      render: (plan) => <Badge variant="neutral" size="sm">{INTERVAL_LABEL[plan.interval] ?? plan.interval}</Badge>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (plan) => (
        <span className="text-text-primary tabular-nums">
          {formatPrice(plan.product?.basePrice ?? 0, plan.product?.currency ?? 'USD')}
          <span className="text-xs text-text-secondary ml-1">/{INTERVAL_SHORT[plan.interval] ?? plan.interval.toLowerCase()}</span>
        </span>
      ),
    },
    {
      key: 'trialDays',
      header: 'Trial',
      render: (plan) => <span className="text-text-secondary">{plan.trialDays > 0 ? `${plan.trialDays}d` : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (plan) => <Badge variant={statusVariant[plan.status]} dot>{plan.status}</Badge>,
    },
    {
      key: 'subscriptions',
      header: 'Tenants',
      render: (plan) => <span className="text-text-primary tabular-nums">{plan._count?.subscriptions ?? '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (plan) => <span className="text-text-secondary">{new Date(plan.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (plan) => {
        const isDefault = plan.planId === h.defaultPlanId;
        const isFree = (plan.product?.basePrice ?? -1) === 0;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionsMenu
              actions={[
                { label: 'Manage', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => h.onManage(plan) },
                { label: 'Open product', icon: <FontAwesomeIcon icon={faBoxOpen} />, onClick: () => h.onOpenProduct(plan) },
                ...(isDefault
                  ? [{ label: 'Remove as default', icon: <FontAwesomeIcon icon={faStarHalfStroke} />, onClick: () => h.onSetDefault(null) }]
                  : isFree
                  ? [{ label: 'Set as default', icon: <FontAwesomeIcon icon={faStar} />, onClick: () => h.onSetDefault(plan.planId) }]
                  : []),
              ]}
            />
          </div>
        );
      },
    },
  ];
}
