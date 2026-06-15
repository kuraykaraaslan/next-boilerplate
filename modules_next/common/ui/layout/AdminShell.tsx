'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/modules_next/common/axios';
import { AppShell } from '@/modules_next/common/ui/layout/AppShell';
import { AppSidebar } from '@/modules_next/common/ui/layout/AppSidebar';
import { AppTopBar } from '@/modules_next/common/ui/layout/AppTopBar';
import { UserMenu } from '@/modules_next/user/ui/UserMenu';
import { NotificationMenu } from '@/modules_next/common/ui/NotificationMenu';
import { useNotifications } from '@/modules_next/notification_inapp/hooks/use-notifications.hook';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
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
  faIdCard,
  faPlug,
  faFileInvoice,
  faTag,
  faBoxOpen,
  faLayerGroup,
  faFileAlt,
  faPuzzlePiece,
  faNewspaper,
  faFolderOpen,
  faWallet,
  faGaugeHigh,
  faClipboardCheck,
  faLifeRing,
  faHouse,
  faToggleOn,
  faMagnifyingGlass,
  faChartLine,
  faCookieBite,
} from '@fortawesome/free-solid-svg-icons';

type AdminShellProps = {
  children: React.ReactNode;
  tenantId: string;
};

export function AdminShell({ children, tenantId }: AdminShellProps) {
  const pathname = usePathname();
  const isRoot = isRootTenant(tenantId);

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName]   = useState('');

  const notifBase = `/tenant/${tenantId}/api/auth/me`;
  const { items: notifications, markAllRead } = useNotifications(notifBase);

  useEffect(() => {
    const sessionUrl = `/tenant/${tenantId}/api/auth/session`;

    api.get(sessionUrl)
      .then((res) => {
        const user = res.data?.user ?? res.data;
        setUserEmail(user?.email ?? '');
        setUserName(user?.email ?? '');
      })
      .catch(() => {});

    api.get(`/tenant/${tenantId}/api/auth/me/profile`)
      .then((res) => {
        const name = res.data?.userProfile?.name;
        if (name) setUserName(name);
      })
      .catch(() => {});
  }, [tenantId]);

  const tenantNavGroups = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', href: `/tenant/${tenantId}/admin`, icon: <FontAwesomeIcon icon={faHouse} aria-hidden /> },
      ],
    },
    {
      label: 'Content',
      items: [
        { id: 'pages',  label: 'Pages',  href: `/tenant/${tenantId}/admin/pages`,  icon: <FontAwesomeIcon icon={faFileAlt} aria-hidden /> },
        { id: 'blocks', label: 'Blocks', href: `/tenant/${tenantId}/admin/blocks`, icon: <FontAwesomeIcon icon={faPuzzlePiece} aria-hidden /> },
      ],
    },
    {
      label: 'Blog',
      items: [
        { id: 'blog-posts',      label: 'Posts',      href: `/tenant/${tenantId}/admin/blog/posts`,      icon: <FontAwesomeIcon icon={faNewspaper} aria-hidden /> },
        { id: 'blog-categories', label: 'Categories', href: `/tenant/${tenantId}/admin/blog/categories`, icon: <FontAwesomeIcon icon={faFolderOpen} aria-hidden /> },
      ],
    },
    {
      label: 'Management',
      items: [
        { id: 'members',      label: 'Members',      href: `/tenant/${tenantId}/admin/members`,      icon: <FontAwesomeIcon icon={faPeopleGroup} aria-hidden /> },
        { id: 'invitations',  label: 'Invitations',  href: `/tenant/${tenantId}/admin/invitations`,  icon: <FontAwesomeIcon icon={faEnvelope} aria-hidden /> },
        { id: 'domains',      label: 'Domains',      href: `/tenant/${tenantId}/admin/domains`,      icon: <FontAwesomeIcon icon={faGlobe} aria-hidden /> },
        { id: 'subscription', label: 'Subscription', href: `/tenant/${tenantId}/admin/subscription`, icon: <FontAwesomeIcon icon={faCreditCard} aria-hidden /> },
      ],
    },
    {
      label: 'Commerce',
      items: [
        { id: 'plans',    label: 'Plans',    href: `/tenant/${tenantId}/admin/plans`,    icon: <FontAwesomeIcon icon={faCreditCard} aria-hidden /> },
        { id: 'payments', label: 'Payments', href: `/tenant/${tenantId}/admin/payments`, icon: <FontAwesomeIcon icon={faCreditCard} aria-hidden /> },
        { id: 'invoices', label: 'Invoices', href: `/tenant/${tenantId}/admin/invoices`, icon: <FontAwesomeIcon icon={faFileInvoice} aria-hidden /> },
        { id: 'coupons',  label: 'Coupons',  href: `/tenant/${tenantId}/admin/coupons`,  icon: <FontAwesomeIcon icon={faKey} aria-hidden /> },
        { id: 'wallet',   label: 'Wallet',   href: `/tenant/${tenantId}/admin/wallet`,   icon: <FontAwesomeIcon icon={faWallet} aria-hidden /> },
        { id: 'metering', label: 'Metering', href: `/tenant/${tenantId}/admin/metering`, icon: <FontAwesomeIcon icon={faGaugeHigh} aria-hidden /> },
      ],
    },
    {
      label: 'Operations',
      items: [
        { id: 'approvals', label: 'Approvals',      href: `/tenant/${tenantId}/admin/back-office/approvals`, icon: <FontAwesomeIcon icon={faClipboardCheck} aria-hidden /> },
        { id: 'support',   label: 'Support Tickets', href: `/tenant/${tenantId}/admin/back-office/support`,    icon: <FontAwesomeIcon icon={faLifeRing} aria-hidden /> },
      ],
    },
    {
      label: 'Insights',
      items: [
        { id: 'analytics',     label: 'Analytics',     href: `/tenant/${tenantId}/admin/analytics`,     icon: <FontAwesomeIcon icon={faChartLine} aria-hidden /> },
        { id: 'feature-flags', label: 'Feature Flags', href: `/tenant/${tenantId}/admin/feature-flags`, icon: <FontAwesomeIcon icon={faToggleOn} aria-hidden /> },
        { id: 'search',        label: 'Search',        href: `/tenant/${tenantId}/admin/search`,        icon: <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden /> },
      ],
    },
    {
      label: 'Store',
      items: [
        { id: 'store-categories', label: 'Categories', href: `/tenant/${tenantId}/admin/store/categories`, icon: <FontAwesomeIcon icon={faTag} aria-hidden /> },
        { id: 'store-products',   label: 'Products',   href: `/tenant/${tenantId}/admin/store/products`,   icon: <FontAwesomeIcon icon={faBoxOpen} aria-hidden /> },
        { id: 'store-bundles',    label: 'Bundles',    href: `/tenant/${tenantId}/admin/store/bundles`,    icon: <FontAwesomeIcon icon={faLayerGroup} aria-hidden /> },
      ],
    },
    {
      label: 'Security',
      items: [
        { id: 'saml',     label: 'SAML SSO', href: `/tenant/${tenantId}/admin/saml`,  icon: <FontAwesomeIcon icon={faIdCard} aria-hidden /> },
        { id: 'webhooks', label: 'Webhooks', href: `/tenant/${tenantId}/admin/webhooks`,        icon: <FontAwesomeIcon icon={faPlug} aria-hidden /> },
      ],
    },
    {
      label: 'Developer',
      items: [
        { id: 'api-keys', label: 'API Keys', href: `/tenant/${tenantId}/admin/api-keys`, icon: <FontAwesomeIcon icon={faKey} aria-hidden /> },
        { id: 'api-docs', label: 'API Docs', href: `/tenant/${tenantId}/admin/api-docs`, icon: <FontAwesomeIcon icon={faBook} aria-hidden /> },
        { id: 'ai',       label: 'AI',       href: `/tenant/${tenantId}/admin/ai`,       icon: <FontAwesomeIcon icon={faRobot} aria-hidden /> },
      ],
    },
    {
      label: 'Configuration',
      items: [
        { id: 'settings', label: 'Settings', href: `/tenant/${tenantId}/admin/settings`, icon: <FontAwesomeIcon icon={faGear} aria-hidden /> },
        { id: 'branding', label: 'Branding', href: `/tenant/${tenantId}/admin/settings/branding`, icon: <FontAwesomeIcon icon={faShieldHalved} aria-hidden /> },
        { id: 'consent',  label: 'Consent',  href: `/tenant/${tenantId}/admin/consent`,          icon: <FontAwesomeIcon icon={faCookieBite} aria-hidden /> },
      ],
    },
    {
      label: 'Account',
      items: [
        { id: 'me', label: 'My Profile', href: `/tenant/${tenantId}/admin/me`, icon: <FontAwesomeIcon icon={faCircleUser} aria-hidden /> },
      ],
    },
  ];

  const platformNavGroups = isRoot ? [
    {
      label: 'Platform',
      items: [
        { id: 'platform-tenants',    label: 'Tenants',    href: `/tenant/${tenantId}/admin/tenants`,    icon: <FontAwesomeIcon icon={faBuilding} aria-hidden /> },
        { id: 'platform-users',      label: 'Users',      href: `/tenant/${tenantId}/admin/users`,      icon: <FontAwesomeIcon icon={faUsers} aria-hidden /> },
        { id: 'platform-audit-logs', label: 'Audit Logs', href: `/tenant/${tenantId}/admin/audit-logs`, icon: <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden /> },
      ],
    },
    {
      label: 'Platform System',
      items: [
        { id: 'platform-health', label: 'Health', href: `/tenant/${tenantId}/admin/health`, icon: <FontAwesomeIcon icon={faHeartPulse} aria-hidden /> },
        { id: 'platform-fleet',  label: 'Fleet',  href: `/tenant/${tenantId}/admin/fleet`,  icon: <FontAwesomeIcon icon={faServer} aria-hidden /> },
      ],
    },
  ] : [];

  const navGroups = [...tenantNavGroups, ...platformNavGroups];

  // Pick the most specific (longest) matching href so the Dashboard item
  // (href = the admin root, a prefix of every admin page) only wins on the
  // index route, and nested routes (e.g. settings/branding) beat their parents.
  const activeId = navGroups
    .flatMap((g) => g.items)
    .filter((item) => item.href && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id;

  const profileHref = `/tenant/${tenantId}/admin/me`;
  const logoutHref = `/tenant/${tenantId}/auth/logout`;

  const logo = (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg text-xs font-bold shrink-0">
        <FontAwesomeIcon icon={faShieldHalved} aria-hidden />
      </span>
      <span className="text-sm font-semibold text-text-primary truncate">
        {isRoot ? 'Platform Admin' : 'Tenant Admin'}
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
      mobileSidebarTitle={isRoot ? 'Platform Admin' : 'Tenant Admin'}
    >
      {children}
    </AppShell>
  );
}
