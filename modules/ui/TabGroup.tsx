'use client';
import { cn } from '@/libs/utils/cn';
import { useRef, useState } from 'react';

export type Tab = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  content: React.ReactNode;
};

export function TabGroup({
  tabs,
  defaultTab,
  label = 'Tabs',
  lazy = false,
  className,
}: {
  tabs: Tab[];
  defaultTab?: string;
  label?: string;
  lazy?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '');
  const activated = useRef<Set<string>>(new Set([defaultTab ?? tabs[0]?.id ?? '']));

  function activate(id: string) {
    setActive(id);
    activated.current.add(id);
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIdx = (index + 1) % tabs.length;
      while (tabs[nextIdx].disabled && nextIdx !== index) nextIdx = (nextIdx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (index - 1 + tabs.length) % tabs.length;
      while (tabs[nextIdx].disabled && nextIdx !== index) nextIdx = (nextIdx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIdx = tabs.findIndex((t) => !t.disabled);
    } else if (e.key === 'End') {
      nextIdx = tabs.length - 1 - [...tabs].reverse().findIndex((t) => !t.disabled);
    }
    if (nextIdx !== null && !tabs[nextIdx].disabled) {
      activate(tabs[nextIdx].id);
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div role="tablist" aria-label={label} className="flex border-b border-border">
        {tabs.map((tab, i) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-btn-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              aria-disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              onClick={() => !tab.disabled && activate(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border',
                tab.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
              )}
            >
              {tab.icon && <span aria-hidden="true" className="shrink-0">{tab.icon}</span>}
              {tab.label}
              {tab.badge && <span className="shrink-0">{tab.badge}</span>}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const everActivated = activated.current.has(tab.id);
        const shouldRender = !lazy || everActivated;
        return (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-btn-${tab.id}`}
            tabIndex={0}
            hidden={!isActive}
            className="focus-visible:outline-none"
          >
            {shouldRender ? tab.content : null}
          </div>
        );
      })}
    </div>
  );
}
