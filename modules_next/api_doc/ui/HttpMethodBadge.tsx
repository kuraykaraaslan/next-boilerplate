import { cn } from '@/modules_next/common/utils/cn';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE';

const methodStyles: Record<HttpMethod, string> = {
  GET:     'bg-success-subtle text-success-fg border-success/30',
  POST:    'bg-primary-subtle text-primary border-primary/30',
  PUT:     'bg-warning-subtle text-warning-fg border-warning/30',
  PATCH:   'bg-warning-subtle text-warning-fg border-warning/30',
  DELETE:  'bg-error-subtle text-error-fg border-error/30',
  HEAD:    'bg-surface-sunken text-text-secondary border-border',
  OPTIONS: 'bg-surface-sunken text-text-secondary border-border',
  TRACE:   'bg-surface-sunken text-text-secondary border-border',
};

const sizeStyles = {
  sm: 'text-[10px] px-1.5 py-0 min-w-[38px]',
  md: 'text-xs px-2 py-0.5 min-w-[48px]',
  lg: 'text-sm px-3 py-1 min-w-[60px]',
};

export function HttpMethodBadge({
  method,
  size = 'md',
  className,
}: {
  method: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const m = method.toUpperCase() as HttpMethod;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-mono font-bold border uppercase tracking-wide shrink-0',
        sizeStyles[size],
        methodStyles[m] ?? 'bg-surface-sunken text-text-secondary border-border',
        className,
      )}
    >
      {m}
    </span>
  );
}
