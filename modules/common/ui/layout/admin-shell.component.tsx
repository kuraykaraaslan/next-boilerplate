'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { AppShell } from '@kuraykaraaslan/common/ui/layout/app-shell.component';
import { AppSidebar } from '@kuraykaraaslan/common/ui/layout/app-sidebar.component';
import { AppTopBar } from '@kuraykaraaslan/common/ui/layout/app-top-bar.component';
import { UserMenu } from '@kuraykaraaslan/user/ui/user-menu.component';
import { NotificationMenu } from '@kuraykaraaslan/common/ui/notification-menu.component';
import { ThemeToggle } from '@kuraykaraaslan/common/ui/theme-toggle.component';
import { useNotifications } from '@kuraykaraaslan/notification_inapp/hooks/use-notifications.hook';
import { isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';
import { moduleRegistry } from '@kuraykaraaslan/common/server/module-registry';
import { useModuleEnabled } from '@kuraykaraaslan/common/ui/module-enabled.context.component';
import { resolveIcon, DEFAULT_ICON } from '@kuraykaraaslan/common/ui/icon-map';
import { WorkspaceSwitcher } from '@kuraykaraaslan/common/ui/layout/workspace-switcher.component';
import {
  WORKSPACES,
  FALLBACK_WORKSPACE,
  ALWAYS_ON_GROUPS,
  resolveWorkspaceId,
} from '@kuraykaraaslan/common/ui/layout/workspaces.config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faServer,
  faShieldHalved,
  faCircleUser,
  faHeartPulse,
  faHouse,
} from '@fortawesome/free-solid-svg-icons';

type AdminShellProps = {
  children: React.ReactNode;
  tenantId: string;
  tenantName?: string;
};

export function AdminShell({ children, tenantId, tenantName }: AdminShellProps) {
  const pathname = usePathname();
  const isRoot = isRootTenant(tenantId);

  // Sidebar collapse is lifted here so both the sidebar and the shell header can
  // react to it — collapsing the sidebar swaps the full logo (icon + title) for
  // the icon-only compact logo, hiding the title text.
  const [collapsed, setCollapsed] = useState(false);

  // Active workspace (which top-level section of the sidebar is shown). `undefined`
  // until resolved post-mount, so SSR and the first client render both show ALL
  // groups (no hydration mismatch, no empty-sidebar flash); the effect below then
  // narrows it. Persisted in localStorage, scoped by root/tenant.
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);

  // Root tenant keeps the fixed "Platform Admin" label; every other tenant shows
  // its own name (falling back to a generic label if the name isn't available).
  const shellTitle = isRoot ? 'Platform Admin' : (tenantName || 'Tenant Admin');

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

  // Base items that are always present and never gated by module activation:
  // the dashboard home, the user's own profile, and (for root) platform-system
  // health/fleet. Every other sidebar entry now comes from module manifests
  // (registry-driven, enable/disable-aware) and is merged in below.
  const tenantNavGroups = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', href: `/tenant/${tenantId}/admin`, icon: <FontAwesomeIcon icon={faHouse} aria-hidden /> },
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
      label: 'Platform System',
      items: [
        { id: 'platform-health', label: 'Health', href: `/tenant/${tenantId}/admin/health`, icon: <FontAwesomeIcon icon={faHeartPulse} aria-hidden /> },
        { id: 'platform-fleet',  label: 'Fleet',  href: `/tenant/${tenantId}/admin/fleet`,  icon: <FontAwesomeIcon icon={faServer} aria-hidden /> },
      ],
    },
  ] : [];

  const hardcodedGroups = [...tenantNavGroups, ...platformNavGroups];

  // Registry-driven menu: every enabled module's manifest-declared menu items
  // are merged into the sidebar (grouped by `group`, deduped by href). Modules
  // register their own admin pages this way, and disabling a module drops its
  // items. Hardcoded groups above remain as the base until every module's menu
  // is fully seeded into manifests (incremental cutover).
  const enabledIds = useModuleEnabled();
  const registryItems = moduleRegistry.getMenuItems({
    scope: isRoot ? undefined : 'tenant',
    enabledIds,
  });
  // Each group carries a `workspaceId` so the workspace switcher can show/hide
  // whole sections. Hardcoded groups resolve by their label (Overview/Account
  // fall to the catch-all but are pinned regardless via ALWAYS_ON_GROUPS).
  const navGroups: Array<{ label: string; items: any[]; workspaceId: string }> =
    hardcodedGroups.map((g) => ({ ...g, items: [...g.items], workspaceId: resolveWorkspaceId({ group: g.label }) }));
  const seenHrefs = new Set(navGroups.flatMap((g) => g.items.map((i) => i.href)));
  for (const it of registryItems) {
    const href = `/tenant/${tenantId}${it.href}`;
    if (seenHrefs.has(href)) continue;
    seenHrefs.add(href);
    const node = {
      id: it.id,
      label: it.label,
      href,
      icon: <FontAwesomeIcon icon={resolveIcon(it.icon) ?? DEFAULT_ICON} aria-hidden />,
    };
    const groupLabel = it.group ?? 'Plugins';
    let group = navGroups.find((g) => g.label === groupLabel);
    if (!group) {
      group = { label: groupLabel, items: [], workspaceId: resolveWorkspaceId(it) };
      navGroups.push(group);
    }
    group.items.push(node);
  }

  // Keep the canonical sidebar section order regardless of manifest scan order.
  const GROUP_ORDER = [
    'Overview', 'Content', 'Blog', 'Management', 'Commerce', 'Operations',
    'Insights', 'Store', 'Security', 'Developer', 'Configuration', 'Account',
    'Plugins', 'Platform', 'Platform System',
  ];
  navGroups.sort(
    (a, b) =>
      (GROUP_ORDER.indexOf(a.label) + 1 || 999) - (GROUP_ORDER.indexOf(b.label) + 1 || 999),
  );

  // Pick the most specific (longest) matching href so the Dashboard item
  // (href = the admin root, a prefix of every admin page) only wins on the
  // index route, and nested routes (e.g. settings/branding) beat their parents.
  const activeId = navGroups
    .flatMap((g) => g.items)
    .filter((item) => item.href && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id;

  // Workspaces actually present for this scope (a workspace with no enabled-module
  // groups is dropped). Always-on groups (Overview/Account) don't count toward a
  // workspace; the synthetic "More" workspace catches any unmapped group.
  const scopedGroups = navGroups.filter((g) => g.label && !ALWAYS_ON_GROUPS.includes(g.label));
  const presentWsIds = new Set(scopedGroups.map((g) => g.workspaceId));
  const availableWorkspaces = [
    ...WORKSPACES.filter((w) => presentWsIds.has(w.id)),
    ...(presentWsIds.has(FALLBACK_WORKSPACE.id) ? [FALLBACK_WORKSPACE] : []),
  ];
  const availableIds = availableWorkspaces.map((w) => w.id);
  const availableKey = availableIds.join(',');

  // Resolve the active workspace once mounted: persisted choice → workspace owning
  // the current route → first available. Runs client-side only (localStorage).
  const storageKey = `admin:workspace:${isRoot ? 'root' : 'tenant'}`;
  useEffect(() => {
    if (availableIds.length === 0) return;
    let next: string | undefined;
    const stored = (() => { try { return localStorage.getItem(storageKey); } catch { return null; } })();
    if (stored && availableIds.includes(stored)) {
      next = stored;
    } else {
      const activeGroup = navGroups.find((g) => g.items.some((i) => i.id === activeId));
      next = (activeGroup && availableIds.includes(activeGroup.workspaceId))
        ? activeGroup.workspaceId
        : availableIds[0];
    }
    setWorkspaceId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoot, activeId, availableKey]);

  function selectWorkspace(id: string) {
    setWorkspaceId(id);
    try { localStorage.setItem(storageKey, id); } catch { /* private mode */ }
  }

  // Until resolved (pre-hydration) show all groups; afterwards show pinned
  // always-on groups + the active workspace's groups. Keeps GROUP_ORDER sort.
  const activeWorkspaceId = workspaceId && availableIds.includes(workspaceId)
    ? workspaceId
    : availableIds[0];
  const visibleGroups = workspaceId === undefined
    ? navGroups
    : navGroups.filter(
        (g) => (g.label && ALWAYS_ON_GROUPS.includes(g.label)) || g.workspaceId === activeWorkspaceId,
      );

  const profileHref = `/tenant/${tenantId}/admin/me`;
  const logoutHref = `/tenant/${tenantId}/auth/logout`;

  const logoIcon = (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg text-xs font-bold shrink-0">
      <FontAwesomeIcon icon={faShieldHalved} aria-hidden />
    </span>
  );

  const logo = (
    <div className="flex items-center gap-2">
      {logoIcon}
      <span className="text-sm font-semibold text-text-primary truncate">
        {shellTitle}
      </span>
    </div>
  );

  const compactLogo = <div className="flex items-center justify-center">{logoIcon}</div>;

  // Only surface the switcher when there's more than one workspace to choose
  // between — a single (or zero) workspace needs no chrome.
  const workspaceHeader = availableWorkspaces.length > 1
    ? ({ collapsed: isCollapsed }: { collapsed: boolean }) => (
        <WorkspaceSwitcher
          workspaces={availableWorkspaces.map((w) => ({ id: w.id, label: w.label, icon: w.icon }))}
          activeId={activeWorkspaceId ?? availableIds[0]}
          onChange={selectWorkspace}
          collapsed={isCollapsed}
        />
      )
    : undefined;

  const sidebar = (
    <AppSidebar
      navGroups={visibleGroups}
      activeId={activeId}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      header={workspaceHeader}
    />
  );

  const topbar = (
    <AppTopBar>
      <div className="flex-1" />
      <ThemeToggle />
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
      compactLogo={compactLogo}
      sidebarCollapsed={collapsed}
      sidebar={sidebar}
      topbar={topbar}
      mobileSidebarTitle={shellTitle}
    >
      {children}
    </AppShell>
  );
}
