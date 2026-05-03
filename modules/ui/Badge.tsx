'use client';
import { cn } from '@/libs/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary';
type BadgeSize = 'sm' | 'md' | 'lg';

const variantMap: Record<BadgeVariant, string> = {
  success: 'bg-success-subtle text-success-fg',
  error:   'bg-error-subtle text-error-fg',
  warning: 'bg-warning-subtle text-warning-fg',
  info:    'bg-info-subtle text-info-fg',
  neutral: 'bg-surface-sunken text-text-secondary',
  primary: 'bg-primary-subtle text-primary',
};

const sizeMap: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const dotColorMap: Record<BadgeVariant, string> = {
  success: 'bg-success',
  error:   'bg-error',
  warning: 'bg-warning',
  info:    'bg-info',
  neutral: 'bg-text-disabled',
  primary: 'bg-primary',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  dismissible = false,
  onDismiss,
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        variantMap[variant],
        sizeMap[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColorMap[variant])}
          aria-hidden="true"
        />
      )}
      {children}
      {dismissible && (
        <button
          type="button"
          aria-label="Remove"
          onClick={onDismiss}
          className="ml-0.5 leading-none hover:opacity-70 transition-opacity focus-visible:outline-none rounded-full"
        >
          <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}
