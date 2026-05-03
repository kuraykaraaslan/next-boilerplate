'use client';
import { cn } from '@/libs/utils/cn';
import { Drawer } from '@/modules/ui/Drawer';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

type AppShellProps = {
  logo?: React.ReactNode;
  compactLogo?: React.ReactNode;
  sidebarCollapsed?: boolean;
  mobileSidebarTitle?: string;
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function AppShell({
  logo,
  compactLogo,
  sidebarCollapsed = false,
  mobileSidebarTitle = 'Navigation',
  sidebar,
  topbar,
  children,
  className,
  ...rest
}: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const logoContent = sidebarCollapsed && compactLogo ? compactLogo : (logo ?? compactLogo);

  return (
    <div className={cn('flex h-screen overflow-hidden bg-surface-base', className)} {...rest}>
      {sidebar && (
        <aside className="relative hidden lg:flex flex-col h-full min-h-0 shrink-0 border-r border-border bg-surface-raised">
          {logoContent && (
            <div className={cn(
              'absolute inset-x-0 top-0 z-10 flex items-center h-14 border-b border-border bg-surface-raised overflow-hidden',
              sidebarCollapsed && compactLogo ? 'justify-center px-2' : 'px-4'
            )}>
              {logoContent}
            </div>
          )}
          <div className={cn('flex min-h-0 flex-1', logoContent && 'pt-14')}>
            {sidebar}
          </div>
        </aside>
      )}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {topbar && (
          <header className="sticky top-0 z-30 flex items-center h-14 px-4 border-b border-border bg-surface-raised/90 backdrop-blur shrink-0">
            {sidebar && (
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open sidebar"
                className="inline-flex lg:hidden items-center justify-center w-9 h-9 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <FontAwesomeIcon icon={faBars} className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            <div className="flex min-w-0 flex-1">{topbar}</div>
          </header>
        )}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>

      {sidebar && (
        <div className="lg:hidden">
          <Drawer
            open={mobileSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
            title={mobileSidebarTitle}
            side="left"
            className="w-72"
          >
            <div className="-mx-4 -my-4 h-[calc(100%+2rem)] flex flex-col">{sidebar}</div>
          </Drawer>
        </div>
      )}
    </div>
  );
}
