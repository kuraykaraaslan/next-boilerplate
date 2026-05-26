'use client';
import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { cn } from '@/modules_next/common/utils/cn';

/* ─── Public types ─────────────────────────────────────────────────────────── */

export type ContextMenuItem =
  | {
      type?: 'item';
      label: string;
      icon?: React.ReactNode;
      shortcut?: string;
      onClick?: () => void;
      danger?: boolean;
      disabled?: boolean;
    }
  | { type: 'separator' }
  | { type: 'group'; label: string };

export type ContextMenuProps = {
  items: ContextMenuItem[];
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
};

type MenuState = {
  rawX: number;
  rawY: number;
  adjX: number;
  adjY: number;
  measured: boolean;
};

function getActionItems(items: ContextMenuItem[]) {
  return items.reduce<number[]>((acc, item, i) => {
    if ((!item.type || item.type === 'item') && !item.disabled) acc.push(i);
    return acc;
  }, []);
}

export function ContextMenu({
  items,
  children,
  disabled = false,
  className,
  onOpenChange,
}: ContextMenuProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [focusedActionIdx, setFocusedActionIdx] = useState<number>(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const isOpen = menu !== null;

  const open = useCallback(
    (clientX: number, clientY: number) => {
      setMenu({ rawX: clientX, rawY: clientY, adjX: clientX, adjY: clientY, measured: false });
      setFocusedActionIdx(-1);
      onOpenChange?.(true);
    },
    [onOpenChange],
  );

  const close = useCallback(() => {
    setMenu(null);
    setFocusedActionIdx(-1);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    open(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!menu || menu.measured || !menuRef.current) return;
    const el = menuRef.current;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 8;
    const adjX = menu.rawX + width > vw - GAP ? Math.max(GAP, menu.rawX - width) : menu.rawX;
    const adjY = menu.rawY + height > vh - GAP ? Math.max(GAP, menu.rawY - height) : menu.rawY;
    setMenu((m) => m ? { ...m, adjX, adjY, measured: true } : null);
  }, [menu]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    const onScroll = () => close();
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const actionIndices = getActionItems(items);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedActionIdx((idx) => {
          const next = actionIndices.indexOf(idx) + 1;
          return actionIndices[next < actionIndices.length ? next : 0] ?? -1;
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedActionIdx((idx) => {
          const pos = actionIndices.indexOf(idx);
          const prev = pos <= 0 ? actionIndices.length - 1 : pos - 1;
          return actionIndices[prev] ?? -1;
        });
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const item = items[focusedActionIdx];
        if (item && (!item.type || item.type === 'item') && item.onClick) {
          item.onClick(); close();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, items, focusedActionIdx, close]);

  useEffect(() => {
    if (!menuRef.current || focusedActionIdx < 0) return;
    menuRef.current.querySelector<HTMLButtonElement>(`[data-item-index="${focusedActionIdx}"]`)
      ?.focus({ preventScroll: true });
  }, [focusedActionIdx]);

  return (
    <div className={cn('relative', className)} onContextMenu={handleContextMenu}>
      {children}
      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-labelledby={labelId}
          style={{ position: 'fixed', top: menu.adjY, left: menu.adjX, visibility: menu.measured ? 'visible' : 'hidden', zIndex: 9999 }}
          className={cn(
            'min-w-[13rem] rounded-xl border border-border bg-surface-raised shadow-2xl py-1.5 outline-none',
            menu.measured && 'animate-in fade-in-0 zoom-in-95 duration-100',
          )}
        >
          {items.map((item, i) => {
            if (item.type === 'separator') return <div key={i} role="separator" aria-orientation="horizontal" className="my-1 mx-2 border-t border-border" />;
            if (item.type === 'group') return <p key={i} role="presentation" className="px-3 pt-2 pb-0.5 text-[11px] font-semibold uppercase tracking-widest text-text-disabled select-none">{item.label}</p>;
            const isActive = i === focusedActionIdx;
            return (
              <button
                key={i} type="button" role="menuitem" tabIndex={isActive ? 0 : -1}
                data-item-index={i} disabled={item.disabled}
                onClick={() => { if (!item.disabled) { item.onClick?.(); close(); } }}
                onMouseEnter={() => setFocusedActionIdx(i)}
                onMouseLeave={() => setFocusedActionIdx(-1)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors select-none focus-visible:outline-none',
                  item.danger ? 'text-error hover:bg-error-subtle focus-visible:bg-error-subtle' : 'text-text-primary hover:bg-surface-overlay focus-visible:bg-surface-overlay',
                  item.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                )}
              >
                {item.icon != null && <span aria-hidden="true" className={cn('w-4 flex items-center justify-center shrink-0', item.danger ? 'text-error' : 'text-text-secondary')}>{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
                {item.shortcut && <kbd className="shrink-0 ml-6 text-[11px] font-mono text-text-disabled">{item.shortcut}</kbd>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
