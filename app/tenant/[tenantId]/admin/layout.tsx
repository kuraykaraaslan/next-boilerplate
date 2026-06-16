import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdminShell } from '@nb/common/ui/layout/AdminShell';
import { ModuleEnabledProvider } from '@nb/common/ui/module-enabled.context';
import { moduleRegistry } from '@nb/common/server/module-registry';
import { pageTitle } from '@nb/common/server/page-metadata';
import { getEnabledModuleIds } from '@nb/setting/server/module-activation.service.next';

// Title for the admin index; nested route layouts set their own.
export const generateMetadata = pageTitle('Dashboard');

export default async function TenantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  // Resolve the per-tenant enabled-module set server-side and provide it to the
  // client tree so menus, slots and widgets filter consistently.
  const enabled = await getEnabledModuleIds(tenantId);

  // Route gate: if the requested admin page is owned by a module that is
  // disabled for this tenant, it must not be reachable by URL — 404 it. Pages
  // not claimed by any module's manifest are never gated (fail open).
  const fullPath = (await headers()).get('x-pathname') ?? '';
  const adminIdx = fullPath.indexOf('/admin');
  if (adminIdx >= 0) {
    const owner = moduleRegistry.findMenuOwner(fullPath.slice(adminIdx));
    if (owner && !enabled.has(owner)) notFound();
  }

  return (
    <ModuleEnabledProvider enabledIds={[...enabled]}>
      <AdminShell tenantId={tenantId}>
        {children}
      </AdminShell>
    </ModuleEnabledProvider>
  );
}
