'use client';
import { cn } from '@nb/common/server/utils/cn';

const sizeMap = {
  sm: { track: 'h-4 w-7',   thumb: 'h-3 w-3',     on: 'translate-x-3.5' },
  md: { track: 'h-5 w-9',   thumb: 'h-3.5 w-3.5', on: 'translate-x-4'   },
  lg: { track: 'h-6 w-11',  thumb: 'h-4 w-4',     on: 'translate-x-5'   },
};

export function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
  size = 'md',
  className,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { track, thumb, on } = sizeMap[size];

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-3',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      <div className="relative shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-checked={checked}
          className="sr-only"
        />
        <div
          className={cn(
            'rounded-full transition-colors duration-200',
            track,
            checked ? 'bg-primary' : 'bg-surface-sunken border border-border'
          )}
        />
        <div
          className={cn(
            'absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-200',
            thumb,
            checked ? on : 'translate-x-0'
          )}
        />
      </div>
      <div>
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {description && (
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}
