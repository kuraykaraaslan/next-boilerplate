'use client';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/modules_next/common/utils/cn';

type Action = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
};

export function RowActionsMenu({ actions }: { actions: Action[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Row actions"
          className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-overlay
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <FontAwesomeIcon icon={faEllipsisVertical} aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="w-40 rounded-lg border border-border bg-surface-base shadow-lg py-1 z-50
                     animate-in fade-in-0 zoom-in-95"
        >
          {actions.map((action) => (
            <DropdownMenu.Item
              key={action.label}
              onSelect={action.onClick}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none',
                'hover:bg-surface-overlay focus:bg-surface-overlay',
                action.variant === 'danger'
                  ? 'text-error hover:bg-error-subtle focus:bg-error-subtle'
                  : 'text-text-primary'
              )}
            >
              {action.icon && <span className="w-4 text-center" aria-hidden>{action.icon}</span>}
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
