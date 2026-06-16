import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { moduleRegistry } from '@nb/common/server/module-registry';
import { getEnabledModuleIds } from '@nb/setting/server/module-activation.service.next';
import { DynamicAdminPage } from '@nb/common/ui/DynamicAdminPage';

// Catch-all dynamic admin route. Admin pages that live INSIDE their module
// (declared in module.json `routes`) are served here: the path is resolved to a
// module page component and rendered only when that module is enabled for the
// tenant. A disabled module simply has no resolvable page → 404. Static file
// routes (dashboard, /me, /modules, and not-yet-migrated pages) take precedence
// over this catch-all, so they keep working during incremental migration.

function adminPathFor(slug: string[] | undefined): string {
  return '/admin' + (slug?.length ? '/' + slug.join('/') : '');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const route = moduleRegistry.findPageRoute(adminPathFor(slug));
  const name = route ? moduleRegistry.getModule(route.moduleId)?.name : undefined;
  return { title: name ? `${name} · Admin` : 'Admin' };
}

export default async function AdminDynamicPage({
  params,
}: {
  params: Promise<{ tenantId: string; slug?: string[] }>;
}) {
  const { tenantId, slug } = await params;
  const route = moduleRegistry.findPageRoute(adminPathFor(slug));
  if (!route) notFound();

  const enabled = await getEnabledModuleIds(tenantId);
  if (!enabled.has(route.moduleId)) notFound();

  return <DynamicAdminPage componentId={route.componentId} tenantId={tenantId} slug={slug ?? []} />;
}
