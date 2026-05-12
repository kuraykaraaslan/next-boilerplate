'use client';
import { cn } from '@/libs/utils/cn';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faStar, faInfinity } from '@fortawesome/free-solid-svg-icons';
import type { BillingInterval } from '@/modules/tenant_subscription/tenant_subscription.enums';

type PlanFeature = {
  featureId: string;
  key: string;
  label: string;
  type: string;
  value: string;
};

type Plan = {
  planId: string;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  currency?: string;
  trialDays?: number;
  isDefault?: boolean;
  features?: PlanFeature[];
};

type Props = {
  plan: Plan;
  billingInterval: BillingInterval;
  current?: boolean;
  onSelect?: (planId: string) => void;
  loading?: boolean;
  className?: string;
};

function formatPrice(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function renderFeatureValue(feature: PlanFeature) {
  if (feature.type === 'BOOLEAN') {
    return feature.value === 'true' ? null : null;
  }
  if (feature.value === '-1') {
    return <FontAwesomeIcon icon={faInfinity} className="w-3 h-3 text-text-secondary" aria-label="Unlimited" />;
  }
  return <span className="text-text-secondary">: {feature.value}</span>;
}

export function SubscriptionPlanCard({ plan, billingInterval, current, onSelect, loading, className }: Props) {
  const price = billingInterval === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
  const currency = plan.currency ?? 'USD';

  const yearlySavingsPct =
    plan.monthlyPrice > 0
      ? Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)
      : 0;

  const showSavings = billingInterval === 'YEARLY' && yearlySavingsPct > 0;
  const isFree = price === 0;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border bg-surface-raised p-6 transition-shadow',
        current
          ? 'border-primary shadow-md shadow-primary/10'
          : 'border-border hover:shadow-md',
        className,
      )}
    >
      {/* Badges */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {current && (
          <Badge variant="primary" size="sm">Current Plan</Badge>
        )}
        {!current && plan.isDefault && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-fg">
            <FontAwesomeIcon icon={faStar} className="w-2.5 h-2.5" aria-hidden="true" />
            Popular
          </span>
        )}
      </div>

      {/* Plan name & description */}
      <div className="mb-4 mt-2">
        <h3 className="text-base font-semibold text-text-primary">{plan.name}</h3>
        {plan.description && (
          <p className="mt-1 text-sm text-text-secondary line-clamp-2">{plan.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="mb-1 flex items-baseline gap-1">
        {isFree ? (
          <span className="text-3xl font-bold text-text-primary tracking-tight">Free</span>
        ) : (
          <>
            <span className="text-3xl font-bold text-text-primary tracking-tight tabular-nums">
              {formatPrice(price, currency)}
            </span>
            <span className="text-sm text-text-secondary">
              /{billingInterval === 'YEARLY' ? 'year' : 'month'}
            </span>
          </>
        )}
      </div>

      {/* Yearly savings */}
      {showSavings && (
        <p className="mb-4 text-xs text-success font-medium">
          Save {yearlySavingsPct}% vs monthly billing
        </p>
      )}

      {!showSavings && <div className="mb-4" />}

      {/* Trial badge */}
      {(plan.trialDays ?? 0) > 0 && !current && (
        <div className="mb-4">
          <Badge variant="neutral" size="sm">{plan.trialDays}-day free trial</Badge>
        </div>
      )}

      {/* Features */}
      {plan.features && plan.features.length > 0 && (
        <ul className="mb-6 flex-1 space-y-2">
          {plan.features.map((f) => (
            <li key={f.featureId} className="flex items-start gap-2 text-sm text-text-primary">
              <FontAwesomeIcon
                icon={faCheck}
                className="w-3.5 h-3.5 text-success mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                {f.label}
                {renderFeatureValue(f)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {onSelect && (
        <Button
          variant={current ? 'outline' : 'primary'}
          fullWidth
          loading={loading}
          disabled={current}
          onClick={() => onSelect(plan.planId)}
          className="mt-auto"
        >
          {current ? 'Current Plan' : isFree ? 'Get Started' : `Choose ${plan.name}`}
        </Button>
      )}
    </div>
  );
}
