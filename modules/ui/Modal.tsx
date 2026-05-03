'use client';
import { cn } from '@/libs/utils/cn';
import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  fullscreen = false,
  scrollable = false,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullscreen?: boolean;
  scrollable?: boolean;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = 'modal-title';
  const descId = description ? 'modal-desc' : undefined;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => prev?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }[size];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex p-4',
        fullscreen ? 'items-stretch justify-stretch' : 'items-center justify-center'
      )}
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full border border-border bg-surface-raised shadow-xl flex flex-col',
          'focus-visible:outline-none',
          fullscreen ? 'rounded-none max-w-none max-h-none h-full' : cn('rounded-xl', sizeClass),
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-text-primary">{title}</h2>
            {description && (
              <p id={descId} className="text-sm text-text-secondary mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 text-text-disabled hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>
        {children && (
          <div className={cn('px-6 py-4 flex-1', scrollable && 'overflow-y-auto')}>
            {children}
          </div>
        )}
        {footer && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
