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
import { redirect } from 'next/navigation';
import { getEnabledModuleIds } from '@kuraykaraaslan/setting/server/module-activation.service.next';
import { authenticateTenantPage } from '@kuraykaraaslan/tenant_session/server/tenant_session.guard.next';
import { getById as getTenantById } from '@kuraykaraaslan/tenant/server/tenant.read.service';
import { AdminShell } from '@kuraykaraaslan/common/ui/layout/admin-shell.component';
import { ModuleEnabledProvider } from '@kuraykaraaslan/common/ui/module-enabled.context.component';

export const metadata: Metadata = { title: 'Admin' };

type Props = {
  children: React.ReactNode;
  params: Promise<{ tenantId: string; slug?: string[] }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { tenantId, slug = [] } = await params;

  // Server-side auth gate for the whole admin shell. The *primary* gate is in
  // proxy.ts (middleware), which 307s unauthenticated admin requests to login
  // before any HTML/RSC streams — so the shell never flashes. This is the
  // defense-in-depth backstop in case a request reaches the layout ungated
  // (matcher gap, direct internal hit). Same semantics: an expired access token
  // with a live refresh token is allowed through (the client refreshes it).
  const auth = await authenticateTenantPage();
  if (!auth.ok) {
    const here = `/tenant/${tenantId}/admin${slug.length ? '/' + slug.join('/') : ''}`;
    redirect(`/tenant/${tenantId}/auth/login?redirect=${encodeURIComponent(here)}`);
  }

  const enabled = await getEnabledModuleIds(tenantId);
  // Resolve the tenant's display name for the shell header. Non-fatal: the shell
  // falls back to a generic label if this lookup fails.
  const tenantName = await getTenantById(tenantId)
    .then((t) => t.name)
    .catch(() => undefined);
  return (
    <ModuleEnabledProvider enabledIds={[...enabled]}>
      <AdminShell tenantId={tenantId} tenantName={tenantName}>{children}</AdminShell>
    </ModuleEnabledProvider>
  );
}
