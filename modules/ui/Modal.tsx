'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/libs/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full border border-border bg-surface-raised shadow-xl rounded-xl flex flex-col',
            'focus:outline-none',
            sizeClass[size],
            className
          )}
        >
          <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border shrink-0">
            <div>
              <Dialog.Title className="text-base font-semibold text-text-primary">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-text-secondary mt-0.5">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close dialog"
                className="shrink-0 text-text-disabled hover:text-text-primary transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          {children && <div className="px-6 py-4 flex-1 overflow-y-auto">{children}</div>}
          {footer && (
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2 shrink-0">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
