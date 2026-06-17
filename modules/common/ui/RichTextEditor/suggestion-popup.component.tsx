'use client';
import { useEffect, useRef } from 'react';
import { cn } from '@kuraykaraaslan/common/server/utils/cn';

export type SuggestionItem = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
};

export function SuggestionPopup({
  open,
  items,
  activeIndex,
  position,
  onSelect,
  onClose,
  emptyMessage = 'No matches',
  ariaLabel = 'Suggestions',
}: {
  open: boolean;
  items: SuggestionItem[];
  activeIndex: number;
  position: { top: number; left: number } | null;
  onSelect: (item: SuggestionItem) => void;
  onClose: () => void;
  emptyMessage?: string;
  ariaLabel?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open) return null;
  const style: React.CSSProperties = position
    ? { position: 'fixed', top: position.top, left: position.left, zIndex: 60 }
    : { position: 'fixed', top: 80, left: 80, zIndex: 60 };

  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      className="w-64 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-lg py-1"
      style={style}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ul ref={listRef} className="space-y-0.5">
        {items.length === 0 ? (
          <li className="px-3 py-2 text-sm text-text-secondary">{emptyMessage}</li>
        ) : items.map((it, idx) => (
          <li
            key={it.id}
            data-idx={idx}
            role="option"
            aria-selected={idx === activeIndex}
            onMouseEnter={() => { /* could expose hover idx setter if needed */ }}
            onClick={() => onSelect(it)}
            className={cn(
              'px-3 py-2 text-sm cursor-pointer flex items-center gap-2',
              idx === activeIndex ? 'bg-primary-subtle text-primary' : 'text-text-primary hover:bg-surface-overlay'
            )}
          >
            {it.icon && <span className="shrink-0 w-5 flex items-center justify-center">{it.icon}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{it.label}</p>
              {it.description && <p className="text-xs text-text-secondary truncate">{it.description}</p>}
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="sr-only"
        aria-label="Close suggestions"
      />
    </div>
  );
}
