'use client';
import { cn } from '@/modules_next/common/utils/cn';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';

export function SearchBar({
  id = 'search',
  placeholder = 'Search…',
  value,
  onChange,
  onClear,
  className,
}: {
  id?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  className?: string;
}) {
  const [internal, setInternal] = useState('');
  const controlled = value !== undefined;
  const currentValue = controlled ? value : internal;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!controlled) setInternal(e.target.value);
    onChange?.(e.target.value);
  }

  function handleClear() {
    if (!controlled) setInternal('');
    onChange?.('');
    onClear?.();
  }

  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <span aria-hidden="true" className="absolute left-3 text-text-disabled pointer-events-none">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="w-3.5 h-3.5" />
      </span>
      <input
        id={id}
        type="text"
        role="searchbox"
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-lg border border-border bg-surface-raised pl-9 pr-8 py-1.5',
          'text-sm text-text-primary placeholder:text-text-disabled',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
          'transition-colors hover:border-border-strong',
        )}
      />
      {currentValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 text-text-disabled hover:text-text-primary transition-colors focus-visible:outline-none"
        >
          <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
