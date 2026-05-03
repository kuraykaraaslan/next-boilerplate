'use client';
import { cn } from '@/libs/utils/cn';

type AppTopBarProps = {
  logo?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function AppTopBar({
  logo,
  children,
  className,
  ...rest
}: AppTopBarProps) {
  return (
    <div className={cn('flex items-center gap-3 flex-1', className)} {...rest}>
      {logo && <div className="shrink-0">{logo}</div>}
      {children}
    </div>
  );
}
