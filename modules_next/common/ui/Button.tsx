'use client';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/libs/utils/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:   'bg-primary text-primary-fg hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-fg hover:bg-secondary-hover',
        ghost:     'bg-transparent text-text-primary hover:bg-surface-overlay',
        danger:    'bg-error text-text-inverse hover:opacity-90',
        outline:   'border border-border text-text-primary hover:bg-surface-overlay',
      },
      size: {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
        xl: 'px-6 py-3 text-lg',
      },
      iconOnly: {
        true:  '',
        false: '',
      },
      fullWidth: {
        true:  'w-full',
        false: '',
      },
    },
    compoundVariants: [
      { iconOnly: true, size: 'xs', class: 'p-1 text-xs' },
      { iconOnly: true, size: 'sm', class: 'p-1.5 text-sm' },
      { iconOnly: true, size: 'md', class: 'p-2 text-sm' },
      { iconOnly: true, size: 'lg', class: 'p-2.5 text-base' },
      { iconOnly: true, size: 'xl', class: 'p-3 text-lg' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      iconOnly: false,
      fullWidth: false,
    },
  }
);

type ButtonProps = VariantProps<typeof button> & {
  children?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  selected?: boolean;
  'data-testid'?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  variant,
  size,
  disabled,
  loading,
  iconLeft,
  iconRight,
  iconOnly = false,
  fullWidth = false,
  selected = false,
  'data-testid': testId,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading}
      aria-pressed={selected ? true : undefined}
      data-testid={testId}
      className={cn(
        button({ variant, size, iconOnly: !!iconOnly, fullWidth: !!fullWidth }),
        selected && 'ring-2 ring-border-focus',
        className
      )}
      {...props}
    >
      {loading && <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full shrink-0" aria-hidden="true" />}
      {!loading && iconLeft && <span aria-hidden="true" className="shrink-0">{iconLeft}</span>}
      {children}
      {!loading && iconRight && <span aria-hidden="true" className="shrink-0">{iconRight}</span>}
    </button>
  );
}
