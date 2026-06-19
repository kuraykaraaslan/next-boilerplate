'use client';
import Link from 'next/link';
import { cn } from '@kuraykaraaslan/common/server/utils/cn';
import { useEffect, useState } from 'react';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronDown } from '@fortawesome/free-solid-svg-icons';

export type AppSidebarNavItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  href?: string;
};

export type AppSidebarNavGroup = {
  label?: string;
  items: AppSidebarNavItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
};

export type AppSidebarSlotRenderContext = {
  collapsed: boolean;
};

type AppSidebarSlot = React.ReactNode | ((context: AppSidebarSlotRenderContext) => React.ReactNode);

// Kept as an alias for backward compatibility with existing imports.
export type AppSidebarFooterRenderContext = AppSidebarSlotRenderContext;

type AppSidebarProps = {
  navGroups?: AppSidebarNavGroup[];
  navItems?: AppSidebarNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  header?: AppSidebarSlot;
  footer?: AppSidebarSlot;
  className?: string;
};

export function AppSidebar({
  navGroups,
  navItems,
  activeId,
  onSelect,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  header,
  footer,
  className,
}: AppSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const resolvedGroups: AppSidebarNavGroup[] = navGroups ?? (navItems ? [{ items: navItems }] : []);
    const initial = new Set<string>();
    for (const g of resolvedGroups) {
      if (!g.collapsible) continue;
      const key = g.label ?? '';
      const containsActive = g.items.some((i) => i.id === activeId);
      if (containsActive || g.defaultExpanded) initial.add(key);
    }
    return initial;
  });
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isCollapsed = collapsed ?? internalCollapsed;
  const effectiveCollapsed = isDesktop ? isCollapsed : false;
  const groups: AppSidebarNavGroup[] = navGroups ?? (navItems ? [{ items: navItems }] : []);
  const footerContent = typeof footer === 'function'
    ? (footer as (context: AppSidebarSlotRenderContext) => React.ReactNode)({ collapsed: effectiveCollapsed })
    : footer;
  const headerContent = typeof header === 'function'
    ? (header as (context: AppSidebarSlotRenderContext) => React.ReactNode)({ collapsed: effectiveCollapsed })
    : header;

  const setCollapsed = (next: boolean) => {
    if (collapsed === undefined) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function isGroupExpanded(group: AppSidebarNavGroup): boolean {
    if (!group.collapsible || effectiveCollapsed) return true;
    return expandedGroups.has(group.label ?? '');
  }

  return (
    <div
      data-collapsed={effectiveCollapsed ? 'true' : 'false'}
      className={cn(
        'flex flex-col flex-1 min-h-0 transition-all duration-200',
        effectiveCollapsed ? 'w-full lg:w-14' : 'w-full lg:w-56',
        className
      )}
    >
      <div className={cn('hidden lg:flex items-center px-2 py-2 border-b border-border shrink-0', effectiveCollapsed ? 'justify-center' : 'justify-end')}>
        <button
          type="button"
          onClick={() => setCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <FontAwesomeIcon icon={faChevronLeft} className={cn('w-4 h-4 transition-transform', isCollapsed ? 'rotate-180' : '')} aria-hidden="true" />
        </button>
      </div>

      {headerContent != null && (
        <div className={cn('shrink-0 border-b border-border px-2 py-2', effectiveCollapsed && 'flex justify-center')}>
          {headerContent}
        </div>
      )}

      <nav
        className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4 sidebar-scrollbar-hover"
        // Collapsed (icon-only) mode is too narrow to spare a reserved scrollbar
        // gutter — `scrollbar-gutter: stable` would push the centered icons left,
        // so drop the reservation here and keep them truly centered.
        style={effectiveCollapsed ? { scrollbarGutter: 'auto' } : undefined}
        aria-label="Sidebar navigation"
      >
        {groups.map((group, gi) => {
          const groupKey = group.label ?? String(gi);
          const expanded = isGroupExpanded(group);
          const hasActive = group.items.some((i) => i.id === activeId);
          return (
            <div key={groupKey}>
              {group.label && !effectiveCollapsed && (
                group.collapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    aria-expanded={expanded}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-1 rounded-md mb-1 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
                      hasActive ? 'text-text-primary' : 'text-text-disabled hover:text-text-secondary'
                    )}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest">{group.label}</span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={cn('w-3 h-3 transition-transform duration-200', expanded ? 'rotate-0' : '-rotate-90')}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled px-3 mb-1">
                    {group.label}
                  </p>
                )
              )}
              {expanded && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const itemClassName = cn(
                      'w-full flex items-center gap-2.5 rounded-lg text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
                      effectiveCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2 text-left',
                      item.id === activeId
                        ? 'bg-primary-subtle text-primary font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
                    );
                    const itemContent = (
                      <>
                        {item.icon && <span aria-hidden="true" className="shrink-0 w-5 text-center text-[15px] leading-none">{item.icon}</span>}
                        {!effectiveCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!effectiveCollapsed && item.badge != null && item.badge > 0 && (
                          <Badge variant="primary" size="sm">{item.badge}</Badge>
                        )}
                      </>
                    );
                    return item.href ? (
                      <Link
                        key={item.id}
                        href={item.href}
                        aria-current={item.id === activeId ? 'page' : undefined}
                        title={effectiveCollapsed ? item.label : undefined}
                        className={itemClassName}
                      >
                        {itemContent}
                      </Link>
                    ) : (
                      <button
                        key={item.id}
                        type="button"
                        aria-current={item.id === activeId ? 'page' : undefined}
                        title={effectiveCollapsed ? item.label : undefined}
                        onClick={() => onSelect?.(item.id)}
                        className={itemClassName}
                      >
                        {itemContent}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {footerContent != null && (
        <div className={cn('border-t border-border shrink-0', effectiveCollapsed ? 'flex justify-center px-2 py-3' : '')}>
          {footerContent}
        </div>
      )}
    </div>
  );
}
