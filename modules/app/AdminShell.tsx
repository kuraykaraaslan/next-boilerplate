'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/libs/axios';
import { AppShell } from '@/modules/app/AppShell';
import { AppSidebar } from '@/modules/app/AppSidebar';
import { AppTopBar } from '@/modules/app/AppTopBar';
import { UserMenu } from '@/modules/domains/common/user/UserMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faBuilding,
  faGear,
  faServer,
  faBook,
  faPeopleGroup,
  faShieldHalved,
  faClockRotateLeft,
  faCreditCard,
  faCircleUser,
  faEnvelope,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';

type AdminShellProps = {
  children: React.ReactNode;
  variant: 'system' | 'tenant';
  tenantId?: string;
};

export function AdminShell({ children, variant, tenantId }: AdminShellProps) {
  const pathname = usePathname();

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName]   = useState('');

  useEffect(() => {
    const sessionUrl = variant === 'system'
      ? '/system/api/auth/session'
      : `/tenant/${tenantId}/api/auth/session`;

    api.get(sessionUrl)
      .then((res) => {
        const user = res.data?.user ?? res.data;
        setUserEmail(user?.email ?? '');
        setUserName(user?.email ?? '');
      })
      .catch(() => {});

    if (variant === 'system') {
      api.get('/system/api/auth/me/profile')
        .then((res) => {
          const name = res.data?.userProfile?.name;
          if (name) setUserName(name);
        })
        .catch(() => {});
    }
  }, [variant, tenantId]);

  const systemNavGroups = [
    {
      label: 'Management',
      items: [
        { id: 'users',      label: 'Users',      href: '/system/admin/users',      icon: <FontAwesomeIcon icon={faUsers} /> },
        { id: 'tenants',    label: 'Tenants',    href: '/system/admin/tenants',    icon: <FontAwesomeIcon icon={faBuilding} /> },
        { id: 'audit-logs', label: 'Audit Logs', href: '/system/admin/audit-logs', icon: <FontAwesomeIcon icon={faClockRotateLeft} /> },
        { id: 'plans',      label: 'Plans',      href: '/system/admin/plans',      icon: <FontAwesomeIcon icon={faCreditCard} /> },
      ],
    },
    {
      label: 'System',
      items: [
        { id: 'fleet',    label: 'Fleet',      href: '/system/fleet',          icon: <FontAwesomeIcon icon={faServer} /> },
        { id: 'api-docs', label: 'API Docs',   href: '/system/admin/api-docs',  icon: <FontAwesomeIcon icon={faBook} /> },
        { id: 'settings', label: 'Settings',   href: '/system/admin/settings',  icon: <FontAwesomeIcon icon={faGear} /> },
        { id: 'me',       label: 'My Profile', href: '/system/admin/me',         icon: <FontAwesomeIcon icon={faCircleUser} /> },
      ],
    },
  ];

  const tenantNavGroups = [
    {
      label: 'Management',
      items: [
        { id: 'members',     label: 'Members',     href: `/tenant/${tenantId}/admin/members`,     icon: <FontAwesomeIcon icon={faPeopleGroup} /> },
        { id: 'settings',    label: 'Settings',    href: `/tenant/${tenantId}/admin/settings`,    icon: <FontAwesomeIcon icon={faGear} /> },
        { id: 'invitations', label: 'Invitations', href: `/tenant/${tenantId}/admin/invitations`, icon: <FontAwesomeIcon icon={faEnvelope} /> },
        { id: 'domains',     label: 'Domains',     href: `/tenant/${tenantId}/admin/domains`,     icon: <FontAwesomeIcon icon={faGlobe} /> },
      ],
    },
    {
      label: 'Developer',
      items: [
        { id: 'api-docs', label: 'API Docs', href: `/tenant/${tenantId}/api-docs`, icon: <FontAwesomeIcon icon={faBook} /> },
      ],
    },
    {
      label: 'Account',
      items: [
        { id: 'me', label: 'My Profile', href: `/tenant/${tenantId}/admin/me`, icon: <FontAwesomeIcon icon={faCircleUser} /> },
      ],
    },
  ];

  const navGroups = variant === 'system' ? systemNavGroups : tenantNavGroups;

  const activeId = navGroups
    .flatMap((g) => g.items)
    .find((item) => item.href && pathname.startsWith(item.href))?.id;

  const profileHref = variant === 'system'
    ? '/system/admin/me'
    : `/tenant/${tenantId}/admin/me`;

  const logoutHref = variant === 'system'
    ? '/system/auth/logout'
    : `/tenant/${tenantId}/auth/logout`;

  const logo = (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg text-xs font-bold shrink-0">
        <FontAwesomeIcon icon={faShieldHalved} />
      </span>
      <span className="text-sm font-semibold text-text-primary truncate">
        {variant === 'system' ? 'System Admin' : 'Tenant Admin'}
      </span>
    </div>
  );

  const sidebar = (
    <AppSidebar
      navGroups={navGroups}
      activeId={activeId}
    />
  );

  const topbar = (
    <AppTopBar>
      <div className="flex-1" />
      {userEmail && (
        <UserMenu
          user={{ name: userName || userEmail, email: userEmail }}
          profileHref={profileHref}
          logoutHref={logoutHref}
        />
      )}
    </AppTopBar>
  );

  return (
    <AppShell
      logo={logo}
      sidebar={sidebar}
      topbar={topbar}
      mobileSidebarTitle={variant === 'system' ? 'System Admin' : 'Tenant Admin'}
    >
      {children}
    </AppShell>
  );
}
