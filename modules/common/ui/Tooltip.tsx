'use client';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '@nb/common/server/utils/cn';

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 400,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}) {
  return (
    <RadixTooltip.Provider delayDuration={delay}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={4}
            className={cn(
              'px-2 py-1 text-xs rounded border border-border bg-surface-overlay text-text-primary shadow-sm',
              'animate-in fade-in-0 zoom-in-95 z-50'
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-surface-overlay" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
