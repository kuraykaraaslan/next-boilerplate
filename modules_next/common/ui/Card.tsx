'use client';
import { cn } from '@/libs/utils/cn';

export function Card({
  title,
  subtitle,
  headerRight,
  footer,
  children,
  variant = 'raised',
  onClick,
  hoverable,
  loading = false,
  className,
}: {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  variant?: 'raised' | 'flat' | 'outline';
  onClick?: () => void;
  hoverable?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const isInteractive = !!onClick;
  const isHoverable   = hoverable || isInteractive;

  const Tag = isInteractive ? 'button' : 'div';

  return (
    <Tag
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl border border-border overflow-hidden text-left',
        variant === 'raised'  && 'bg-surface-raised shadow-sm',
        variant === 'flat'    && 'bg-surface-base',
        variant === 'outline' && 'bg-transparent',
        isHoverable && 'transition-shadow hover:shadow-md hover:border-border-focus cursor-pointer',
        isInteractive && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus w-full',
        loading && 'pointer-events-none',
        className
      )}
    >
      {loading ? (
        <div className="px-6 py-4 space-y-3 animate-pulse">
          <div className="h-4 bg-surface-sunken rounded w-2/3" />
          <div className="h-3 bg-surface-sunken rounded w-full" />
          <div className="h-3 bg-surface-sunken rounded w-4/5" />
          <div className="h-3 bg-surface-sunken rounded w-1/2" />
        </div>
      ) : (
        <>
          {(title || headerRight) && (
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border">
              <div>
                {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
                {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
              </div>
              {headerRight && <div className="shrink-0">{headerRight}</div>}
            </div>
          )}
          {children && <div className="px-6 py-4">{children}</div>}
          {footer && (
            <div className="px-6 py-3 border-t border-border bg-surface-base">
              {footer}
            </div>
          )}
        </>
      )}
    </Tag>
  );
}
