'use client';
import { cn } from '@/libs/utils/cn';

type SkeletonProps = {
  className?: string;
  'aria-label'?: string;
};

export function Skeleton({ className, 'aria-label': ariaLabel }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel ?? 'Loading...'}
      className={cn(
        'animate-pulse motion-reduce:animate-none rounded-md bg-surface-overlay',
        className
      )}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading..." className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse motion-reduce:animate-none rounded bg-surface-overlay h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading..." className={cn('rounded-xl border border-border p-4 space-y-3', className)}>
      <Skeleton className="h-5 w-1/3" />
      <SkeletonText lines={3} />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading table...">
      <div className="flex gap-4 border-b border-border pb-3 mb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3 border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ))}
    </div>
  );
}
