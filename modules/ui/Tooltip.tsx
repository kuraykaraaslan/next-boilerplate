'use client';
import { cn } from '@/libs/utils/cn';
import { useRef, useState } from 'react';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

const placementClass: Record<TooltipPlacement, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({
  content,
  placement = 'top',
  delay = 0,
  children,
  className,
}: {
  content: React.ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useRef(`tooltip-${Math.random().toString(36).slice(2)}`).current;

  function show() {
    if (delay > 0) {
      timer.current = setTimeout(() => setVisible(true), delay);
    } else {
      setVisible(true);
    }
  }

  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  }

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'absolute z-50 w-max max-w-xs px-2 py-1 rounded text-xs pointer-events-none',
            'bg-surface-overlay text-text-primary border border-border shadow-sm',
            placementClass[placement],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
