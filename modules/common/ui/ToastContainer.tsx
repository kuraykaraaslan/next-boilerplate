'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToastStore } from './toast.store';
import { cn } from '@nb/common/server/utils/cn';

const variantClass: Record<string, string> = {
  success: 'bg-success text-success-fg border-success',
  error:   'bg-error text-text-inverse border-error',
  warning: 'bg-warning text-warning-fg border-warning',
  info:    'bg-info text-info-fg border-info',
};

export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast: t, onRemove }: { toast: any; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(t.id), t.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onRemove]);

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start justify-between gap-3 px-4 py-3 rounded-lg border shadow-md text-sm font-medium',
        variantClass[t.variant]
      )}
    >
      <span>{t.message}</span>
      <button
        type="button"
        onClick={() => onRemove(t.id)}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
      >
        ×
      </button>
    </div>
  );
}
