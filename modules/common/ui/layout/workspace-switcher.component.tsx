'use client';
import { useRef, useState, useEffect } from 'react';
import { cn } from '@kuraykaraaslan/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';

export type WorkspaceOption = { id: string; label: string; icon: IconDefinition };

// Dropdown that switches the active sidebar workspace. Mirrors UserMenu's
// custom-state + click-outside pattern. Collapses to an icon-only trigger when
// the sidebar is collapsed, but the panel still opens with full labels.
export function WorkspaceSwitcher({
  workspaces,
  activeId,
  onChange,
  collapsed = false,
  className,
}: {
  workspaces: WorkspaceOption[];
  activeId: string;
  onChange: (id: string) => void;
  collapsed?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  if (!active) return null;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        title={collapsed ? active.label : undefined}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-lg text-sm transition-colors',
          'border border-border bg-surface hover:bg-surface-overlay',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
          collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
        )}
      >
        <FontAwesomeIcon
          icon={active.icon}
          className="w-4 text-center text-text-secondary shrink-0"
          aria-hidden="true"
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left font-medium text-text-primary">{active.label}</span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className={cn('w-3 h-3 text-text-disabled transition-transform', open && 'rotate-180')}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute left-0 top-full mt-1 min-w-full w-48 rounded-xl border border-border bg-surface-raised shadow-lg overflow-hidden z-50'
          )}
        >
          <div className="py-1">
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                role="menuitem"
                onClick={() => { onChange(w.id); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
                  'hover:bg-surface-overlay focus-visible:outline-none focus-visible:bg-surface-overlay',
                  w.id === active.id ? 'text-primary font-medium' : 'text-text-primary'
                )}
              >
                <FontAwesomeIcon icon={w.icon} className="w-4 text-center text-text-secondary shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate">{w.label}</span>
                {w.id === active.id && (
                  <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-primary" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
