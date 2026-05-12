'use client';
import { cn } from '@/modules_next/common/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

export type DateRange = { start: Date | null; end: Date | null };

function toValue(d: Date | null): string {
  return d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
}

function fromValue(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function DateRangePicker({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  disabled,
  required,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value?: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const range: DateRange = value ?? { start: null, end: null };
  const hintId  = hint  ? `${id}-hint`  : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const startStr = toValue(range.start);
  const endStr   = toValue(range.end);

  function handleStart(e: React.ChangeEvent<HTMLInputElement>) {
    const start = fromValue(e.target.value);
    onChange({ start, end: range.end && start && range.end < start ? null : range.end });
  }

  function handleEnd(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ start: range.start, end: fromValue(e.target.value) });
  }

  const inputClass = cn(
    'block w-full rounded-md border px-3 py-2 text-sm transition-colors',
    'text-text-primary bg-surface-base',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-sunken',
    error ? 'border-error ring-1 ring-error bg-error-subtle' : 'border-border'
  );

  return (
    <div className={cn('space-y-1', className)}>
      <fieldset>
        <legend className="block text-sm font-medium text-text-primary mb-1">
          {label}
          {required && (
            <>
              <span className="text-error ml-1" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </>
          )}
        </legend>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor={`${id}-start`} className="sr-only">Start date</label>
            <input
              id={`${id}-start`}
              type="date"
              value={startStr}
              onChange={handleStart}
              disabled={disabled}
              required={required}
              max={endStr || undefined}
              aria-label="Start date"
              aria-describedby={hintId}
              aria-invalid={!!error}
              className={inputClass}
            />
          </div>
          <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5 text-text-disabled shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <label htmlFor={`${id}-end`} className="sr-only">End date</label>
            <input
              id={`${id}-end`}
              type="date"
              value={endStr}
              onChange={handleEnd}
              disabled={disabled}
              required={required}
              min={startStr || undefined}
              aria-label="End date"
              aria-invalid={!!error}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>
      {hint && !error && <p id={hintId} className="text-xs text-text-secondary">{hint}</p>}
      {error && <p id={errorId} className="text-xs text-error" role="alert">{error}</p>}
    </div>
  );
}
