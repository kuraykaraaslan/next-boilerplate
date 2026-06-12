'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { isBrowser } from '@/modules_next/common/utils/isBrowser';
import { CurrencyCodeEnum } from '@/modules/common';
import { getCountryDataList } from 'countries-list';
import * as Flags from 'country-flag-icons/react/3x2';
import { cn } from '@/modules_next/common/utils/cn';
import { Button } from '@/modules_next/common/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

// Best-effort currency → representative country, used only for the flag icon.
// (@/modules/common is the source of truth for *which* currencies exist; this
// map is a cosmetic lookup that common deliberately doesn't provide.)
const currencyToCountry: Record<string, string> = {};
for (const c of getCountryDataList()) {
  for (const cur of c.currency) {
    if (!currencyToCountry[cur]) currencyToCountry[cur] = c.iso2;
  }
}

// Canonical ISO 4217 currency list, single-sourced from @/modules/common.
const ALL_CURRENCIES = [...CurrencyCodeEnum.options]
  .sort()
  .map((cur) => ({ value: cur, countryCode: currencyToCountry[cur] }));

function CurrencyFlag({ countryCode }: { countryCode?: string }) {
  if (!countryCode) return null;
  const FlagComp = Flags[countryCode as keyof typeof Flags] as React.ComponentType<React.SVGProps<SVGSVGElement>> | undefined;
  if (!FlagComp) return null;
  return <FlagComp className="w-4 h-auto rounded-[2px] shadow-sm shrink-0" />;
}

type CurrencySelectorProps = {
  value: string;
  onChange: (currency: string) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function CurrencySelector({
  value,
  onChange,
  id = 'currency',
  label = 'Currency',
  disabled = false,
  className,
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? ALL_CURRENCIES.filter((c) => c.value.toLowerCase().includes(search.toLowerCase()))
    : ALL_CURRENCIES;

  function handleOpen() {
    if (disabled) return;
    if (!open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen((p) => !p);
  }

  useEffect(() => {
    if (!open) { setSearch(''); return; }
    setTimeout(() => searchRef.current?.focus(), 0);

    function onOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !(document.getElementById('currency-portal'))?.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onScroll() {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const panel = open && rect && (
    <div
      id="currency-portal"
      role="listbox"
      aria-label="Select currency"
      style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
      className="rounded-lg border border-border bg-surface-raised shadow-lg"
    >
      <div className="p-2 border-b border-border">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search currency…"
          className={cn(
            'w-full rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-sm text-text-primary',
            'placeholder:text-text-disabled',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
          )}
        />
      </div>
      <ul className="max-h-56 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-sm text-text-secondary">No results</li>
        )}
        {filtered.map((opt) => (
          <li key={opt.value}>
            <button
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                'focus-visible:outline-none focus-visible:bg-surface-overlay',
                opt.value === value
                  ? 'bg-primary-subtle text-primary font-medium'
                  : 'text-text-primary hover:bg-surface-overlay',
              )}
            >
              <CurrencyFlag countryCode={opt.countryCode} />
              <span>{opt.value}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div ref={triggerRef} className="relative w-full">
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={handleOpen}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <CurrencyFlag countryCode={currencyToCountry[value]} />
            <span>{value}</span>
          </span>
          <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-text-disabled" />
        </Button>
      </div>
      {isBrowser && createPortal(panel, document.body)}
    </div>
  );
}
