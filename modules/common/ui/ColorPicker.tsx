'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@nb/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export const DEFAULT_COLOR_SWATCHES = [
  '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#ffffff',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#fca5a5', '#fdba74', '#fcd34d', '#fde047', '#bef264', '#86efac', '#6ee7b7', '#5eead4',
];

export type ColorPickerProps = {
  id?: string;
  label?: string;
  value?: string | null;
  onChange: (color: string | null) => void;
  swatches?: string[];
  showHexInput?: boolean;
  showNativePicker?: boolean;
  showNoColor?: boolean;
  align?: 'left' | 'right';
  triggerLabel?: string;
  className?: string;
  popoverClassName?: string;
  disabled?: boolean;
  /** Compact toolbar mode: render trigger as an icon button with a
      thin colored bar at the bottom (matches Quill toolbar buttons). */
  iconOnly?: boolean;
  /** FontAwesome icon shown inside the trigger (only used with iconOnly). */
  icon?: IconDefinition;
};

function normalizeHex(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (s[0] !== '#') s = '#' + s;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  return null;
}

export function ColorPicker({
  id,
  label,
  value,
  onChange,
  swatches = DEFAULT_COLOR_SWATCHES,
  showHexInput = true,
  showNativePicker = true,
  showNoColor = false,
  align = 'left',
  triggerLabel,
  className,
  popoverClassName,
  disabled = false,
  iconOnly = false,
  icon,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value ?? '');
  const [lastValue, setLastValue] = useState(value);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  if (value !== lastValue) {
    setLastValue(value);
    setHex(value ?? '');
  }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commitHex = () => {
    const n = normalizeHex(hex);
    if (n) { onChange(n); setOpen(false); }
  };

  return (
    <div ref={wrapRef} className={cn('relative inline-block', className)}>
      {label && !iconOnly && (
        <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1">{label}</label>
      )}
      {iconOnly ? (
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={triggerLabel || 'Pick a color'}
          title={triggerLabel}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            'kui-rte-btn relative inline-flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded text-text-primary',
            'hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          )}
        >
          {icon && <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" aria-hidden="true" />}
          <span
            className="absolute bottom-0.5 left-1 right-1 h-0.5 rounded-sm"
            style={{ background: value || 'transparent' }}
            aria-hidden="true"
          />
        </button>
      ) : (
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={triggerLabel || label || 'Pick a color'}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm text-text-primary',
            'hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          )}
        >
          <span
            className="w-4 h-4 rounded-sm border border-border shrink-0"
            style={{ background: value || 'transparent', backgroundImage: value ? undefined : 'linear-gradient(45deg, var(--surface-sunken) 25%, transparent 25%, transparent 75%, var(--surface-sunken) 75%), linear-gradient(45deg, var(--surface-sunken) 25%, transparent 25%, transparent 75%, var(--surface-sunken) 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}
            aria-hidden="true"
          />
          <span className="font-mono text-xs">{value || 'none'}</span>
          <FontAwesomeIcon icon={faChevronDown} className="w-2.5 h-2.5 text-text-disabled" aria-hidden="true" />
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-label="Color picker"
          className={cn(
            'absolute top-full mt-1 z-50 w-64 p-3 rounded-lg border border-border bg-surface-raised shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            popoverClassName
          )}
        >
          <div className="grid grid-cols-8 gap-1 mb-3">
            {swatches.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                title={c}
                onClick={() => { onChange(c); setOpen(false); }}
                className={cn(
                  'w-6 h-6 rounded-sm border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
                  value && value.toLowerCase() === c.toLowerCase() && 'ring-2 ring-border-focus'
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          {(showHexInput || showNativePicker || showNoColor) && (
            <div className="flex items-center gap-2">
              {showHexInput && (
                <input
                  type="text"
                  inputMode="text"
                  spellCheck={false}
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitHex(); } }}
                  onBlur={commitHex}
                  placeholder="#000000"
                  aria-label="Hex color"
                  className="flex-1 min-w-0 font-mono text-xs px-2 py-1 rounded border border-border bg-surface-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              )}
              {showNativePicker && (
                <input
                  type="color"
                  value={normalizeHex(value ?? '#000000') ?? '#000000'}
                  onChange={(e) => onChange(e.target.value)}
                  aria-label="Native color picker"
                  className="w-7 h-7 rounded border border-border bg-surface-base cursor-pointer p-0"
                />
              )}
              {showNoColor && (
                <button
                  type="button"
                  onClick={() => { onChange(null); setOpen(false); }}
                  aria-label="No color"
                  title="No color"
                  className="w-7 h-7 inline-flex items-center justify-center rounded border border-border bg-surface-base text-text-secondary hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
