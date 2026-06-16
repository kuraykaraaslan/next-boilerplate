'use client';
import type { ReactNode } from 'react';
import { cn } from '@nb/common/server/utils/cn';

export type RadioOption = {
  value: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
};

type RadioGroupVariant = 'default' | 'card';
type RadioGroupColumns = 1 | 2 | 3;

export function RadioGroup({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  disabled,
  className,
  optionClassName,
  variant = 'default',
  columns = 1,
}: {
  name: string;
  legend: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  optionClassName?: string;
  variant?: RadioGroupVariant;
  columns?: RadioGroupColumns;
}) {
  return (
    <fieldset className={cn('space-y-1', className)}>
      <legend className="mb-2 text-sm font-medium text-text-primary">
        {legend}
      </legend>

      <div
        className={cn(
          columns === 1 && 'space-y-2',
          columns > 1 && 'grid gap-2',
          columns === 2 && 'grid-cols-1 sm:grid-cols-2',
          columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;

          return (
            <label
              key={opt.value}
              className={cn(
                'flex items-start gap-2',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                variant === 'card' && [
                  'rounded-lg border border-border bg-surface-base p-3 transition-colors',
                  'hover:border-border-focus',
                  isSelected && 'border-primary bg-primary-subtle',
                  error && 'border-error',
                ],
                optionClassName
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onChange?.(opt.value)}
                className={cn(
                  'mt-0.5 h-4 w-4 border-border text-primary',
                  'focus-visible:ring-2 focus-visible:ring-border-focus',
                  error && 'border-error'
                )}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {opt.icon && (
                    <span className="text-lg leading-none text-text-secondary">{opt.icon}</span>
                  )}
                  <span className="text-sm text-text-primary">{opt.label}</span>
                </div>
                {opt.hint && (
                  <p className="mt-0.5 text-xs text-text-secondary">{opt.hint}</p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="mt-1 text-xs text-error" role="alert">{error}</p>
      )}
    </fieldset>
  );
}
