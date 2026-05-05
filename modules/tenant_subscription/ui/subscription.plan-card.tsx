'use client';
// Displays a subscription plan with features list — uses PriceDisplay pattern from next_components
import { cn } from '@/libs/utils/cn';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

type PlanFeature = { featureId: string; key: string; name?: string; value?: string | null };

type Plan = {
  planId: string;
  name: string;
  description?: string | null;
  price: number | string;
  currency?: string;
  billingPeriod?: string | null;
  features?: PlanFeature[];
  isActive?: boolean;
};

type Props = {
  plan: Plan;
  current?: boolean;
  onSelect?: (planId: string) => void;
  loading?: boolean;
  className?: string;
};

function formatPrice(amount: number | string, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

export function SubscriptionPlanCard({ plan, current, onSelect, loading, className }: Props) {
  return (
    <div className={cn(
      'relative flex flex-col rounded-xl border bg-surface-raised p-6',
      current ? 'border-primary shadow-md' : 'border-border',
      className,
    )}>
      {current && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="primary" size="sm">Current Plan</Badge>
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary">{plan.name}</h3>
        {plan.description && (
          <p className="text-sm text-text-secondary mt-1">{plan.description}</p>
        )}
      </div>

      <div className="mb-6">
        <span className="text-3xl font-bold text-text-primary tabular-nums">
          {formatPrice(plan.price, plan.currency)}
        </span>
        {plan.billingPeriod && (
          <span className="text-sm text-text-secondary ml-1">/{plan.billingPeriod.toLowerCase()}</span>
        )}
      </div>

      {plan.features && plan.features.length > 0 && (
        <ul className="space-y-2 mb-6 flex-1">
          {plan.features.map((f) => (
            <li key={f.featureId} className="flex items-start gap-2 text-sm text-text-primary">
              <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
              <span>{f.name ?? f.key}{f.value ? `: ${f.value}` : ''}</span>
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
        >
          {current ? 'Current Plan' : 'Select Plan'}
        </Button>
      )}
    </div>
  );
}
