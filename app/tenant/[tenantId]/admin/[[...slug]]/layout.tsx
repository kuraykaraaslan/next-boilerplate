// Persistent admin shell. Living in a *layout* (not the page) is what keeps the
// sidebar + topbar mounted across admin→admin navigations: App Router only
// re-renders `children` on navigation and preserves the layout, so the shell no
// longer flickers and the loading boundary (loading.tsx) falls *inside* the
// shell's content area instead of replacing the whole screen.
//
// Admin lives in its own static `admin/` segment so this layout is unconditional
// (always AdminShell) — a layout that switched shells by slug would not re-run on
// param changes. The sibling universal `[[...slug]]` route still serves auth/public.
import type { Metadata } from 'next';
import { getEnabledModuleIds } from '@kuraykaraaslan/setting/server/module-activation.service.next';
import { AdminShell } from '@kuraykaraaslan/common/ui/layout/admin-shell.component';
import { ModuleEnabledProvider } from '@kuraykaraaslan/common/ui/module-enabled.context.component';

export const metadata: Metadata = { title: 'Admin' };

type Props = {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { tenantId } = await params;
  const enabled = await getEnabledModuleIds(tenantId);
  return (
    <ModuleEnabledProvider enabledIds={[...enabled]}>
      <AdminShell tenantId={tenantId}>{children}</AdminShell>
    </ModuleEnabledProvider>
  );
}
