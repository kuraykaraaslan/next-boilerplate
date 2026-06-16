'use client';
import { useRef, useState, useEffect } from 'react';
import { cn } from '@nb/common/server/utils/cn';
import { Avatar } from '@nb/common/ui/avatar.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faArrowRightFromBracket, faChevronDown } from '@fortawesome/free-solid-svg-icons';

export interface UserMenuUser {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export function UserMenu({
  user,
  profileHref,
  logoutHref,
  className,
}: {
  user: UserMenuUser;
  profileHref: string;
  logoutHref: string;
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

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
          'hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus'
        )}
      >
        <Avatar src={user.avatarUrl} name={user.name} size="sm" />
        <span className="hidden sm:block text-text-primary font-medium truncate max-w-[120px]">{user.name}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={cn('w-3 h-3 text-text-disabled transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full mt-1 w-52 rounded-xl border border-border bg-surface-raised shadow-lg overflow-hidden z-50'
          )}
        >
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
            <p className="text-xs text-text-secondary truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <a
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary',
                'hover:bg-surface-overlay transition-colors',
                'focus-visible:outline-none focus-visible:bg-surface-overlay'
              )}
            >
              <FontAwesomeIcon icon={faCircleUser} className="w-3.5 h-3.5 text-text-secondary" aria-hidden="true" />
              My Profile
            </a>
            <a
              href={logoutHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 text-sm text-error',
                'hover:bg-error-subtle transition-colors',
                'focus-visible:outline-none focus-visible:bg-error-subtle'
              )}
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-3.5 h-3.5" aria-hidden="true" />
              Sign out
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
