'use client';
import { cn } from '@/libs/utils/cn';
import { AlertBanner } from '@/modules/ui/AlertBanner';

type FormProps = {
  title?: string;
  description?: string;
  error?: string;
  columns?: 1 | 2;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  className?: string;
};

export function Form({
  title,
  description,
  error,
  columns = 1,
  actions,
  children,
  onSubmit,
  className,
}: FormProps) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn('space-y-6', className)}
    >
      {(title || description) && (
        <div>
          {title && <h2 className="text-lg font-semibold text-text-primary">{title}</h2>}
          {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
        </div>
      )}

      {error && <AlertBanner variant="error" message={error} />}

      <div className={cn(
        'grid gap-4',
        columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'
      )}>
        {children}
      </div>

      {actions && (
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          {actions}
        </div>
      )}
    </form>
  );
}
