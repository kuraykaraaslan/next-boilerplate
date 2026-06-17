'use client';
import { cn } from '@kuraykaraaslan/common/server/utils/cn';
import type { FeatureAccessResult } from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.types';

type Props = {
  result: FeatureAccessResult & { type: 'LIMIT' };
  label?: string;
  className?: string;
};

function getBarVariant(percent: number): string {
  if (percent >= 100) return 'bg-error';
  if (percent >= 80) return 'bg-warning';
  return 'bg-success';
}

function getTextVariant(percent: number): string {
  if (percent >= 100) return 'text-error-fg';
  if (percent >= 80) return 'text-warning-fg';
  return 'text-text-secondary';
}

export function PlanUsageMeter({ result, label, className }: Props) {
  const { current, limit, unlimited, effectiveLimit, inGrace } = result;

  if (unlimited) {
    return (
      <div className={cn('space-y-1.5', className)}>
        {label && <p className="text-xs font-medium text-text-primary">{label}</p>}
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>{current ?? 0} used</span>
          <span>Unlimited</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden">
          <div className="h-full w-0 bg-success" />
        </div>
      </div>
    );
  }

  const displayCurrent = current ?? 0;
  const percent = Math.min(Math.round((displayCurrent / limit) * 100), 100);

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <p className="text-xs font-medium text-text-primary">{label}</p>}
      <div className="flex items-center justify-between text-xs">
        <span className={cn('font-medium', getTextVariant(percent))}>
          {displayCurrent} / {limit}
          {inGrace && (
            <span className="ml-1 text-warning-fg">(grace period)</span>
          )}
        </span>
        <span className={cn(getTextVariant(percent))}>{percent}%</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden"
        role="progressbar"
        aria-valuenow={displayCurrent}
        aria-valuemin={0}
        aria-valuemax={effectiveLimit ?? limit}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', getBarVariant(percent))}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
