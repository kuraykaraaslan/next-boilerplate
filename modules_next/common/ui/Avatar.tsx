'use client';
import { cn } from '@/libs/utils/cn';

const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const statusColorMap = {
  online:  'bg-success',
  offline: 'bg-text-disabled',
  away:    'bg-warning',
  busy:    'bg-error',
};

const statusDotSizeMap = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
};

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function Avatar({
  src,
  name,
  size = 'md',
  status,
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof sizeMap;
  status?: keyof typeof statusColorMap;
  className?: string;
}) {
  const sizeClass = sizeMap[size];

  const inner = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={cn(sizeClass, 'rounded-full object-cover border border-border shrink-0', className)}
    />
  ) : (
    <span
      aria-label={name}
      className={cn(
        sizeClass,
        'rounded-full bg-primary-subtle text-primary font-semibold',
        'flex items-center justify-center shrink-0 border border-primary-subtle select-none',
        className
      )}
    >
      {getInitials(name)}
    </span>
  );

  if (!status) return inner;

  return (
    <span className="relative inline-flex shrink-0">
      {inner}
      <span
        aria-label={status}
        className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-surface-base',
          statusColorMap[status],
          statusDotSizeMap[size]
        )}
      />
    </span>
  );
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
}: {
  avatars: { src?: string | null; name: string }[];
  max?: number;
  size?: keyof typeof sizeMap;
}) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className="flex -space-x-2" aria-label={`${avatars.length} users`}>
      {visible.map((a, i) => (
        <Avatar key={i} {...a} size={size} className="ring-2 ring-surface-base" />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            sizeMap[size],
            'rounded-full bg-surface-sunken text-text-secondary font-semibold text-xs',
            'flex items-center justify-center shrink-0 ring-2 ring-surface-base border border-border select-none'
          )}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
