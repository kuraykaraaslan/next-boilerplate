'use client';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@kuraykaraaslan/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

const badge = cva(
  'inline-flex items-center gap-1 rounded-full font-medium',
  {
    variants: {
      variant: {
        success: 'bg-success-subtle text-success-fg',
        error:   'bg-error-subtle text-error-fg',
        warning: 'bg-warning-subtle text-warning-fg',
        info:    'bg-info-subtle text-info-fg',
        neutral: 'bg-surface-sunken text-text-secondary',
        primary: 'bg-primary-subtle text-primary',
      },
      size: {
        sm: 'px-1.5 py-0 text-[10px]',
        md: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

const dotColorMap: Record<NonNullable<VariantProps<typeof badge>['variant']>, string> = {
  success: 'bg-success',
  error:   'bg-error',
  warning: 'bg-warning',
  info:    'bg-info',
  neutral: 'bg-text-disabled',
  primary: 'bg-primary',
};

type BadgeProps = VariantProps<typeof badge> & {
  children: React.ReactNode;
  dot?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
};

export function Badge({ children, variant = 'neutral', size, dot, dismissible, onDismiss, className }: BadgeProps) {
  return (
    <span className={cn(badge({ variant, size }), className)}>
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColorMap[variant ?? 'neutral'])}
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
