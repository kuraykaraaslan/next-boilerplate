'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/libs/axios';
import { AppShell } from '@/modules/ui/layout/AppShell';
import { AppSidebar } from '@/modules/ui/layout/AppSidebar';
import { AppTopBar } from '@/modules/ui/layout/AppTopBar';
import { UserMenu } from '@/modules/user/ui/user.menu';
import { NotificationMenu } from '@/modules/ui/NotificationMenu';
import { useNotifications } from '@/modules/notification_inapp/use-notifications.hook';
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
  faRobot,
  faKey,
  faHeartPulse,
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

  const notifBase = variant === 'system' ? '/system/api/auth/me' : null;
  const { items: notifications, markAllRead } = useNotifications(notifBase ?? '/system/api/auth/me');

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
        { id: 'users',      label: 'Users',      href: '/system/admin/users',      icon: <FontAwesomeIcon icon={faUsers} aria-hidden /> },
        { id: 'tenants',    label: 'Tenants',    href: '/system/admin/tenants',    icon: <FontAwesomeIcon icon={faBuilding} aria-hidden /> },
        { id: 'audit-logs', label: 'Audit Logs', href: '/system/admin/audit-logs', icon: <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden /> },
        { id: 'plans',      label: 'Plans',      href: '/system/admin/plans',      icon: <FontAwesomeIcon icon={faCreditCard} aria-hidden /> },
        { id: 'payments',   label: 'Payments',   href: '/system/admin/payments',   icon: <FontAwesomeIcon icon={faCreditCard} aria-hidden /> },
      ],
    },
    {
      label: 'System',
      items: [
        { id: 'health',   label: 'Health',     href: '/system/admin/health',     icon: <FontAwesomeIcon icon={faHeartPulse} aria-hidden /> },
        { id: 'fleet',    label: 'Fleet',      href: '/system/fleet',          icon: <FontAwesomeIcon icon={faServer} aria-hidden /> },
        { id: 'ai',       label: 'AI',         href: '/system/admin/ai',         icon: <FontAwesomeIcon icon={faRobot} aria-hidden /> },
        { id: 'api-docs', label: 'API Docs',   href: '/system/admin/api-docs',  icon: <FontAwesomeIcon icon={faBook} aria-hidden /> },
        { id: 'settings', label: 'Settings',   href: '/system/admin/settings',  icon: <FontAwesomeIcon icon={faGear} aria-hidden /> },
        { id: 'me',       label: 'My Profile', href: '/system/admin/me',         icon: <FontAwesomeIcon icon={faCircleUser} aria-hidden /> },
      ],
    },
  ];

  const tenantNavGroups = [
    {
      label: 'Management',
      items: [
        { id: 'members',      label: 'Members',      href: `/tenant/${tenantId}/admin/members`,             icon: <FontAwesomeIcon icon={faPeopleGroup} aria-hidden /> },
        { id: 'settings',    label: 'Settings',    href: `/tenant/${tenantId}/admin/settings`,           icon: <FontAwesomeIcon icon={faGear} aria-hidden /> },
        { id: 'invitations', label: 'Invitations', href: `/tenant/${tenantId}/admin/invitations`,        icon: <FontAwesomeIcon icon={faEnvelope} aria-hidden /> },
        { id: 'domains',     label: 'Domains',     href: `/tenant/${tenantId}/admin/domains`,            icon: <FontAwesomeIcon icon={faGlobe} aria-hidden /> },
        { id: 'subscription',label: 'Subscription',href: `/tenant/${tenantId}/admin/subscription`,      icon: <FontAwesomeIcon icon={faCreditCard} aria-hidden /> },
      ],
    },
    {
      label: 'Developer',
      items: [
        { id: 'api-keys', label: 'API Keys', href: `/tenant/${tenantId}/admin/api-keys`, icon: <FontAwesomeIcon icon={faKey} aria-hidden /> },
        { id: 'api-docs', label: 'API Docs', href: `/tenant/${tenantId}/api-docs`, icon: <FontAwesomeIcon icon={faBook} aria-hidden /> },
      ],
    },
    {
      label: 'Account',
      items: [
        { id: 'me', label: 'My Profile', href: `/tenant/${tenantId}/admin/me`, icon: <FontAwesomeIcon icon={faCircleUser} aria-hidden /> },
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
        <FontAwesomeIcon icon={faShieldHalved} aria-hidden />
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
      <NotificationMenu
        items={notifications}
        onMarkAllRead={markAllRead}
        align="right"
      />
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
