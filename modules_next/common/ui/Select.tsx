'use client';
import { cn } from '@/modules_next/common/utils/cn';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';

export type SelectOption = { value: string; label: string; icon?: React.ReactNode };

type BaseProps = {
  id: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  className?: string;
};

type NativeProps = BaseProps & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'>;

function CustomSelect({
  id, label, options, placeholder, hint, error, disabled, required, searchable, className,
  value, onChange,
}: BaseProps & { value?: string; onChange?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const hintId  = hint  ? `${id}-hint`  : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const selected = options.find((o) => o.value === value);
  const filtered = searchable && search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) { setSearch(''); return; }
    if (searchable) setTimeout(() => searchRef.current?.focus(), 30);
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open, searchable]);

  function select(v: string) {
    onChange?.(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); }
  }

  return (
    <div ref={containerRef} className={cn('space-y-1', className)}>
      <label id={`${id}-label`} className="block text-sm font-medium text-text-primary">
        {label}
        {required && <><span className="text-error ml-1" aria-hidden="true">*</span><span className="sr-only">(required)</span></>}
      </label>

      <div
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        aria-disabled={disabled}
        aria-required={required}
        id={id}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          'flex items-center gap-2 w-full rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
          error   ? 'border-error ring-1 ring-error bg-error-subtle'
                  : 'border-border bg-surface-base',
          disabled && 'opacity-50 cursor-not-allowed bg-surface-sunken'
        )}
      >
        {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
        <span className={cn('flex-1', !selected && 'text-text-disabled')}>
          {selected ? selected.label : (placeholder ?? 'Select…')}
        </span>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="w-3 h-3 text-text-disabled" aria-hidden="true" />
      </div>

      {open && (
        <div className="z-20 w-full rounded-md border border-border bg-surface-raised shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-border">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className={cn(
                  'block w-full rounded-md border border-border bg-surface-base px-3 py-1.5 text-sm',
                  'text-text-primary placeholder:text-text-disabled',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus'
                )}
              />
            </div>
          )}
          <ul role="listbox" aria-labelledby={`${id}-label`} className="py-1 max-h-48 overflow-y-auto">
            {placeholder && !search && (
              <li
                role="option"
                aria-selected={!value}
                onClick={() => select('')}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(''); } }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer text-text-disabled select-none',
                  'hover:bg-surface-overlay focus-visible:outline-none focus-visible:bg-surface-overlay'
                )}
              >
                {placeholder}
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-sm text-center text-text-secondary">No results found.</li>
            ) : (
              filtered.map((opt) => {
                const active = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={active}
                    onClick={() => select(opt.value)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt.value); } }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer select-none',
                      'hover:bg-surface-overlay transition-colors',
                      'focus-visible:outline-none focus-visible:bg-surface-overlay',
                      active && 'text-primary font-medium'
                    )}
                  >
                    {opt.icon && <span className="shrink-0" aria-hidden="true">{opt.icon}</span>}
                    {opt.label}
                    {active && <FontAwesomeIcon icon={faCheck} className="ml-auto w-3 h-3 text-primary" aria-hidden="true" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {hint && !error && <p id={hintId} className="text-xs text-text-secondary">{hint}</p>}
      {error && <p id={errorId} className="text-xs text-error" role="alert">{error}</p>}
    </div>
  );
}

export function Select({ id, label, options, placeholder, hint, error, disabled, required, searchable, className, ...props }: NativeProps) {
  const hasIcons = options.some((o) => o.icon);

  if (hasIcons || searchable) {
    const { value, onChange, ...rest } = props as { value?: string; onChange?: React.ChangeEventHandler<HTMLSelectElement> };
    return (
      <CustomSelect
        id={id} label={label} options={options} placeholder={placeholder}
        hint={hint} error={error} disabled={disabled} required={required}
        searchable={searchable} className={className}
        value={value as string | undefined}
        onChange={(v) => onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLSelectElement>)}
        {...rest}
      />
    );
  }

  const hintId  = hint  ? `${id}-hint`  : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-text-primary">
        {label}
        {required && (
          <>
            <span className="text-error ml-1" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>
      <select
        id={id}
        disabled={disabled}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={!!error}
        className={cn(
          'block w-full rounded-md border px-3 py-2 text-sm transition-colors appearance-none',
          'bg-surface-base text-text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:border-border-focus',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-sunken',
          error ? 'border-error ring-1 ring-error bg-error-subtle' : 'border-border'
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {hint && !error && <p id={hintId} className="text-xs text-text-secondary">{hint}</p>}
      {error && <p id={errorId} className="text-xs text-error" role="alert">{error}</p>}
    </div>
  );
}
