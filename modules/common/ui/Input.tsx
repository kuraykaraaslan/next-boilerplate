'use client';
import { cn } from '@nb/common/server/utils/cn';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faXmark, faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';

type InputState = 'default' | 'error' | 'success';

type InputProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  success?: string;
  required?: boolean;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  showCount?: boolean;
  maxLength?: number;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({
  id,
  label,
  hint,
  error,
  success,
  required,
  prefixIcon,
  suffixIcon,
  clearable,
  onClear,
  showCount,
  maxLength,
  className,
  value,
  onChange,
  readOnly,
  type,
  step,
  min,
  max,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const isNumber   = type === 'number';

  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const state: InputState = error ? 'error' : success ? 'success' : 'default';

  const describedBy = [
    hint && !error && !success ? `${id}-hint` : null,
    error ? `${id}-error` : null,
    success && !error ? `${id}-success` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const hasSuffix = suffixIcon || (clearable && value) || isPassword;
  const hasPrefix = !!prefixIcon;

  const inputBaseClass = cn(
    'block w-full rounded-md border px-3 py-2 text-sm transition-colors',
    'text-text-primary placeholder:text-text-disabled',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-sunken',
    'read-only:bg-surface-sunken read-only:cursor-default',
    state === 'error'   && 'border-error ring-1 ring-error bg-error-subtle',
    state === 'success' && 'border-success ring-1 ring-success bg-success-subtle',
    state === 'default' && 'border-border bg-surface-base',
    hasPrefix && 'pl-9',
    (hasSuffix || isNumber) && 'pr-9',
  );

  const charCount = typeof value === 'string' ? value.length : 0;

  function increment() {
    const current = Number(value ?? 0);
    const stepVal = Number(step ?? 1);
    const maxVal  = max !== undefined ? Number(max) : Infinity;
    const next    = Math.min(current + stepVal, maxVal);
    onChange?.({ target: { value: String(next) } } as React.ChangeEvent<HTMLInputElement>);
  }

  function decrement() {
    const current = Number(value ?? 0);
    const stepVal = Number(step ?? 1);
    const minVal  = min !== undefined ? Number(min) : -Infinity;
    const next    = Math.max(current - stepVal, minVal);
    onChange?.({ target: { value: String(next) } } as React.ChangeEvent<HTMLInputElement>);
  }

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
        {readOnly && (
          <span className="ml-2 text-xs font-normal text-text-disabled">(read-only)</span>
        )}
      </label>

      <div className="relative">
        {prefixIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none">
            {prefixIcon}
          </span>
        )}

        <input
          id={id}
          type={resolvedType}
          required={required}
          readOnly={readOnly}
          aria-invalid={state === 'error'}
          aria-describedby={describedBy || undefined}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          step={step}
          min={min}
          max={max}
          className={cn(inputBaseClass, isNumber && '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
          {...props}
        />

        {isPassword && !readOnly && (
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-primary transition-colors focus-visible:outline-none text-sm"
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-3.5 h-3.5" />
          </button>
        )}

        {clearable && value && !readOnly && !isPassword && (
          <button
            type="button"
            aria-label="Clear"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-primary transition-colors focus-visible:outline-none"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
          </button>
        )}

        {suffixIcon && !clearable && !isPassword && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none">
            {suffixIcon}
          </span>
        )}

        {isNumber && !readOnly && (
          <div className="absolute right-0 top-0 h-full flex flex-col border-l border-border overflow-hidden rounded-r-md">
            <button
              type="button"
              aria-label="Increment"
              onClick={increment}
              tabIndex={-1}
              className="flex-1 px-2 text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors focus-visible:outline-none border-b border-border leading-none flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faChevronUp} className="w-2 h-2" />
            </button>
            <button
              type="button"
              aria-label="Decrement"
              onClick={decrement}
              tabIndex={-1}
              className="flex-1 px-2 text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors focus-visible:outline-none leading-none flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faChevronDown} className="w-2 h-2" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          {hint && !error && !success && (
            <p id={`${id}-hint`} className="text-xs text-text-secondary">{hint}</p>
          )}
          {error && (
            <p id={`${id}-error`} className="text-xs text-error" role="alert">{error}</p>
          )}
          {success && !error && (
            <p id={`${id}-success`} className="text-xs text-success-fg">{success}</p>
          )}
        </div>
        {showCount && maxLength && (
          <p className={cn('text-xs shrink-0', charCount >= maxLength ? 'text-error' : 'text-text-disabled')}>
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
