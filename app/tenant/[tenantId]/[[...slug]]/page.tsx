// Universal tenant page catch-all ("ultimate dynamic"): one route serves every
// page — admin, auth, public and the CMS — by resolving the path to a
// module-owned page (module.json `routes`). The shell + gating are chosen by the
// first path segment:
//   /admin/*  -> AdminShell + ModuleEnabledProvider, gated by enabled modules
//   /auth/*   -> AuthShell (public, ungated)
//   else      -> module public page, or the CMS dynamic page as a fallback
// API stays a separate route handler (api/[...slug]/route.ts) — Next.js does not
// allow page.tsx and route.ts on the same segment.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { moduleRegistry } from '@nb/common/server/module-registry';
import { getEnabledModuleIds } from '@nb/setting/server/module-activation.service.next';
import { DynamicAdminPage } from '@nb/common/ui/dynamic-admin-page.component';
import { AdminShell } from '@nb/common/ui/layout/admin-shell.component';
import { AuthShell } from '@nb/common/ui/auth-shell.component';
import { ModuleEnabledProvider } from '@nb/common/ui/module-enabled.context.component';
import PublicDynamicPage, { buildPublicPageMetadata } from '@nb/dynamic_page/ui/public-dynamic-page.component';

type Props = {
  params: Promise<{ tenantId: string; slug?: string[] }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { tenantId, slug = [] } = await params;
  const { lang } = await searchParams;
  if (slug[0] === 'admin') return { title: 'Admin' };
  if (slug[0] === 'auth') return { title: 'Sign in' };
  const match = moduleRegistry.findPageRoute('/' + slug.join('/'));
  if (match) return { title: moduleRegistry.getModule(match.route.moduleId)?.name ?? 'Page' };
  return buildPublicPageMetadata({ tenantId, slugSegments: slug, lang });
}

export default async function Page({ params, searchParams }: Props) {
  const { tenantId, slug = [] } = await params;
  const { lang } = await searchParams;
  const path = '/' + slug.join('/');

  // ---- admin: shell + per-tenant module gating ----
  if (slug[0] === 'admin') {
    const enabled = await getEnabledModuleIds(tenantId);
    const match = moduleRegistry.findPageRoute(path);
    if (!match || !enabled.has(match.route.moduleId)) notFound();
    return (
      <ModuleEnabledProvider enabledIds={[...enabled]}>
        <AdminShell tenantId={tenantId}>
          <DynamicAdminPage
            componentId={match.route.componentId}
            tenantId={tenantId}
            params={match.params}
            slug={slug}
          />
        </AdminShell>
      </ModuleEnabledProvider>
    );
  }

  // ---- auth: shared centered shell, public (ungated) ----
  if (slug[0] === 'auth') {
    const match = moduleRegistry.findPageRoute(path);
    if (!match) notFound();
    return (
      <AuthShell>
        <DynamicAdminPage
          componentId={match.route.componentId}
          tenantId={tenantId}
          params={match.params}
          slug={slug}
        />
      </AuthShell>
    );
  }

  // ---- public: a module public page, else the CMS dynamic page ----
  const match = moduleRegistry.findPageRoute(path);
  if (match) {
    return (
      <DynamicAdminPage
        componentId={match.route.componentId}
        tenantId={tenantId}
        params={match.params}
        slug={slug}
      />
    );
  }
  return <PublicDynamicPage tenantId={tenantId} slugSegments={slug} lang={lang} />;
}
