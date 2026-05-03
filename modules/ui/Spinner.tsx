'use client';
import { cn } from '@/libs/utils/cn';

const sizeMap = {
  xs:  'h-3 w-3 border',
  sm:  'h-4 w-4 border-2',
  md:  'h-6 w-6 border-2',
  lg:  'h-8 w-8 border-[3px]',
  xl:  'h-12 w-12 border-4',
};

export function Spinner({
  size = 'md',
  className,
}: {
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'inline-block rounded-full border-border border-t-primary animate-spin',
          sizeMap[size],
          className
        )}
      />
      <span className="sr-only">Loading…</span>
    </>
  );
}
