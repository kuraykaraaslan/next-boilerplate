'use client';
import { cn } from '@/libs/utils/cn';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faTriangleExclamation, faCircleXmark, faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

const variantMap: Record<AlertVariant, { container: string; defaultIcon: React.ReactNode }> = {
  success: { container: 'bg-success-subtle border-success text-success-fg', defaultIcon: <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4" /> },
  warning: { container: 'bg-warning-subtle border-warning text-warning-fg', defaultIcon: <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4" /> },
  error:   { container: 'bg-error-subtle border-error text-error-fg',       defaultIcon: <FontAwesomeIcon icon={faCircleXmark} className="w-4 h-4" /> },
  info:    { container: 'bg-info-subtle border-info text-info-fg',          defaultIcon: <FontAwesomeIcon icon={faCircleInfo} className="w-4 h-4" /> },
};

export type AlertAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function AlertBanner({
  variant = 'info',
  title,
  message,
  dismissible = false,
  action,
  icon,
  className,
}: {
  variant?: AlertVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  action?: AlertAction;
  icon?: React.ReactNode;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const { container, defaultIcon } = variantMap[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4',
        container,
        className
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 font-bold">
        {icon ?? defaultIcon}
      </span>
      <div className="flex-1 text-sm min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <p className={cn(title && 'mt-0.5')}>{message}</p>
        {action && (
          <div className="mt-2">
            {action.href ? (
              <a
                href={action.href}
                className="text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
              >
                {action.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
              >
                {action.label}
              </button>
            )}
          </div>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="shrink-0 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
