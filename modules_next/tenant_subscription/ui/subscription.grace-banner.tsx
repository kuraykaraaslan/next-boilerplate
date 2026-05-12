'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faXmark, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/libs/utils/cn';
import type { GracePeriodStatus } from '@/modules/tenant_subscription/tenant_subscription.types';

type Props = {
  status: GracePeriodStatus;
  tenantId: string;
  dismissible?: boolean;
  className?: string;
};

export function GracePeriodBanner({ status, tenantId, dismissible = true, className }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!status.inGrace || dismissed) return null;

  const days = status.daysRemaining ?? 0;
  const urgency = days <= 1 ? 'error' : days <= 3 ? 'warning' : 'warning';

  const containerClass = urgency === 'error'
    ? 'bg-error/10 border-error/30 text-error'
    : 'bg-warning/10 border-warning/30 text-warning-fg';

  const upgradeHref = `/tenant/${tenantId}/admin/settings?tab=subscription`;

  const message = days <= 0
    ? 'Your subscription grace period has ended. Renew now to restore access.'
    : days === 1
    ? 'Your subscription grace period ends today. Renew now to avoid losing access.'
    : `Your subscription payment failed. You have ${days} day${days !== 1 ? 's' : ''} left in your grace period.`;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4',
        containerClass,
        className,
      )}
    >
      <FontAwesomeIcon
        icon={faTriangleExclamation}
        className="mt-0.5 w-4 h-4 shrink-0"
        aria-hidden="true"
      />
      <div className="flex-1 text-sm min-w-0">
        <p className="font-semibold">Subscription Payment Required</p>
        <p className="mt-0.5">{message}</p>
        <div className="mt-2">
          <a
            href={upgradeHref}
            className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
          >
            Renew Subscription
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-2.5 h-2.5" aria-hidden="true" />
          </a>
        </div>
      </div>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="shrink-0 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
