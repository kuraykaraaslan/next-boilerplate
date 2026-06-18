// Admin content for the universal-page model, now in its own segment so the shell
// (layout.tsx) persists across navigations. Only the module page that fills the
// shell's content area is resolved/gated here; the shell + module-enabled provider
// live in layout.tsx. `slug` here is the path *after* /admin, so we re-add the
// /admin prefix to resolve against the registry (routes are registered as /admin/*).
import { notFound } from 'next/navigation';
import { moduleRegistry } from '@kuraykaraaslan/common/server/module-registry';
import { getEnabledModuleIds } from '@kuraykaraaslan/setting/server/module-activation.service.next';
import { DynamicAdminPage } from '@kuraykaraaslan/common/ui/dynamic-admin-page.component';

type Props = {
  params: Promise<{ tenantId: string; slug?: string[] }>;
};

export default async function AdminPage({ params }: Props) {
  const { tenantId, slug = [] } = await params;
  const path = '/admin' + (slug.length ? '/' + slug.join('/') : '');

  const enabled = await getEnabledModuleIds(tenantId);
  const match = moduleRegistry.findPageRoute(path);
  if (!match || !enabled.has(match.route.moduleId)) notFound();

  return (
    <DynamicAdminPage
      componentId={match.route.componentId}
      tenantId={tenantId}
      params={match.params}
      slug={['admin', ...slug]}
    />
  );
}
