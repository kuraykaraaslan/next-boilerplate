import { cn } from '@/libs/utils/cn';

type BrandLogoProps = {
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
};

export function BrandLogo({ children, size = 'md', className }: BrandLogoProps) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-2xl bg-primary text-primary-fg font-bold shadow-sm',
        size === 'sm'  && 'h-8 w-8 text-sm',
        size === 'md'  && 'h-12 w-12 text-lg',
        size === 'lg'  && 'h-16 w-16 text-2xl',
        size === 'xl'  && 'h-20 w-20 text-3xl',
        size === '2xl' && 'h-24 w-24 text-4xl',
        className
      )}
    >
      {children}
    </span>
  );
}
