'use client';
import { cn } from '@/libs/utils/cn';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';

export type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
  variant?: 'info' | 'success' | 'warning' | 'error';
  onClick?: () => void;
};

type NotificationMenuProps = {
  items: NotificationItem[];
  onMarkAllRead?: () => void;
  onViewAll?: () => void;
  align?: 'left' | 'right';
  className?: string;
};

const variantDot: Record<NonNullable<NotificationItem['variant']>, string> = {
  info:    'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error:   'bg-error',
};

export function NotificationMenu({
  items,
  onMarkAllRead,
  onViewAll,
  align = 'right',
  className,
}: NotificationMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <FontAwesomeIcon icon={faBell} className="w-4 h-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-error text-primary-fg text-[10px] font-bold leading-none pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            'absolute top-full mt-2 z-50 w-80 rounded-xl border border-border bg-surface-raised shadow-xl overflow-hidden',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-error text-primary-fg text-[10px] font-bold leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            {onMarkAllRead && unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-disabled">
                <FontAwesomeIcon icon={faBell} className="w-6 h-6" aria-hidden="true" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { item.onClick?.(); setOpen(false); }}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                    'hover:bg-surface-overlay focus-visible:outline-none focus-visible:bg-surface-overlay',
                    !item.read && 'bg-primary-subtle/40'
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 shrink-0 w-2 h-2 rounded-full',
                      item.read ? 'bg-transparent' : (variantDot[item.variant ?? 'info'])
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm truncate',
                      item.read ? 'text-text-secondary' : 'text-text-primary font-medium'
                    )}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                    <p className="text-[11px] text-text-disabled mt-1">{item.timestamp}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {onViewAll && (
            <div className="border-t border-border">
              <button
                type="button"
                onClick={() => { onViewAll(); setOpen(false); }}
                className="w-full py-2.5 text-xs text-primary font-medium hover:bg-surface-overlay transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
