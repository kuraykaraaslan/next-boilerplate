'use client';
import { cn } from '@/libs/utils/cn';

type ActionVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

const variantMap: Record<ActionVariant, string> = {
  primary:   'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'bg-secondary text-secondary-fg hover:bg-secondary-hover',
  outline:   'border border-border text-text-primary hover:bg-surface-overlay',
  danger:    'bg-error text-text-inverse hover:opacity-90',
  ghost:     'bg-transparent text-text-primary hover:bg-surface-overlay',
};

export type PageHeaderAction = {
  label: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: ActionVariant;
  disabled?: boolean;
};

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: PageHeaderAction[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 pb-5 border-b border-border',
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-text-primary leading-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>

      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {actions.map((action, i) => {
            const cls = cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              variantMap[action.variant ?? 'primary']
            );
            if (action.href) {
              return (
                <a key={i} href={action.href} className={cls}>
                  {action.label}
                </a>
              );
            }
            return (
              <button
                key={i}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cls}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
