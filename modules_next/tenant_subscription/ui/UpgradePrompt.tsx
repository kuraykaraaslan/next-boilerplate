'use client';
import { cn } from '@/libs/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import type { FeatureAccessResult } from '@/modules/tenant_subscription/tenant_subscription.types';

type Props = {
  result: FeatureAccessResult;
  tenantId: string;
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

function defaultTitle(result: FeatureAccessResult): string {
  if (result.type === 'LIMIT') return 'Plan limit reached';
  return 'Feature not available';
}

function defaultDescription(result: FeatureAccessResult): string {
  if (result.type === 'LIMIT') {
    return `You've reached the limit of ${result.limit} on your current plan. Upgrade to add more.`;
  }
  return 'This feature is not included in your current plan. Upgrade to unlock it.';
}

export function UpgradePrompt({ result, tenantId, title, description, compact = false, className }: Props) {
  const upgradeHref = `/tenant/${tenantId}/admin/settings?tab=subscription`;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-warning-fg', className)}>
        <FontAwesomeIcon icon={faLock} className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{title ?? defaultTitle(result)}</span>
        <a
          href={upgradeHref}
          className="ml-auto text-primary font-medium underline underline-offset-2 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded text-xs"
        >
          Upgrade
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="ml-1 w-2.5 h-2.5" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center gap-4 rounded-xl border border-border bg-surface-raised p-8 text-center',
      className,
    )}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-subtle">
        <FontAwesomeIcon icon={faLock} className="w-5 h-5 text-warning-fg" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-text-primary">{title ?? defaultTitle(result)}</p>
        <p className="text-sm text-text-secondary max-w-xs">{description ?? defaultDescription(result)}</p>
      </div>
      <a
        href={upgradeHref}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Upgrade Plan
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
