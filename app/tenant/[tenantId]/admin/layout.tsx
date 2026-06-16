import { AdminShell } from '@nb/common/ui/layout/AdminShell';
import { ModuleEnabledProvider } from '@nb/common/ui/module-enabled.context';
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
  const enabledIds = [...(await getEnabledModuleIds(tenantId))];
  return (
    <ModuleEnabledProvider enabledIds={enabledIds}>
      <AdminShell tenantId={tenantId}>
        {children}
      </AdminShell>
    </ModuleEnabledProvider>
  );
}
