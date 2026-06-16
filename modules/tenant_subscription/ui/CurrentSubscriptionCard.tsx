'use client';

import { Card } from '@nb/common/ui/Card';
import { Badge } from '@nb/common/ui/Badge';
import { Button } from '@nb/common/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faFlask, faClock, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import type { TenantSubscriptionWithPlan } from '@nb/tenant_subscription/server/tenant_subscription.types';
import {
  STATUS_VARIANT, intervalLabel, intervalShortLabel, formatDate, formatPrice,
} from './subscription.helpers';

export function CurrentSubscriptionCard({
  subscription,
  onCancel,
}: {
  subscription: TenantSubscriptionWithPlan;
  onCancel: () => void;
}) {
  const { plan, status, billingInterval, currentPeriodEnd, trialEndsAt, cancelledAt } = subscription;
  const price = Number(plan.product?.basePrice ?? 0);
  const planName = plan.product?.name ?? 'Plan';

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-text-primary">{planName}</h3>
            <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} dot size="sm">
              {status === 'TRIALING' ? 'Trial' : status.charAt(0) + status.slice(1).toLowerCase()}
            </Badge>
            <Badge variant="neutral" size="sm">{intervalLabel(billingInterval)}</Badge>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {status !== 'CANCELLED' && currentPeriodEnd && (
              <div className="flex items-center gap-2 text-text-secondary">
                <FontAwesomeIcon icon={faCalendar} className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {status === 'ACTIVE' ? 'Renews' : 'Access until'}{' '}
                  <span className="text-text-primary font-medium">{formatDate(currentPeriodEnd)}</span>
                </span>
              </div>
            )}
            {status === 'TRIALING' && trialEndsAt && (
              <div className="flex items-center gap-2 text-text-secondary">
                <FontAwesomeIcon icon={faFlask} className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Trial ends{' '}
                  <span className="text-text-primary font-medium">{formatDate(trialEndsAt)}</span>
                </span>
              </div>
            )}
            {status === 'CANCELLED' && cancelledAt && (
              <div className="flex items-center gap-2 text-text-secondary">
                <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Cancelled on{' '}
                  <span className="text-text-primary font-medium">{formatDate(cancelledAt)}</span>
                </span>
              </div>
            )}
          </div>

          {plan.features && plan.features.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
              {plan.features.slice(0, 6).map((f) => (
                <li key={f.featureId} className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-success" />
                  {f.label}
                  {f.value && f.value !== 'true' && f.type === 'LIMIT' && (
                    <span className="text-text-tertiary">
                      {f.value === '-1' ? ' (unlimited)' : ` (${f.value})`}
                    </span>
                  )}
                </li>
              ))}
              {plan.features.length > 6 && (
                <li className="text-text-tertiary">+{plan.features.length - 6} more</li>
              )}
            </ul>
          )}
        </div>

        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 shrink-0">
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {formatPrice(price, plan.product?.currency ?? 'USD')}
            <span className="text-sm font-normal text-text-secondary ml-1">
              /{intervalShortLabel(billingInterval)}
            </span>
          </p>
          {status !== 'CANCELLED' && status !== 'EXPIRED' && (
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel Plan</Button>
          )}
        </div>
      </div>
    </Card>
  );
}
