// Catch-all for module-owned PUBLIC auth pages. Sits under auth/layout.tsx so
// the shared centered auth shell is preserved. Resolves /auth/<slug> to an auth
// module page (declared in module.json `routes`) and renders it. Public — not
// gated by module-enabled state (sign-in must always work). Specific auth file
// routes, if any, take precedence over this catch-all.
import { notFound } from 'next/navigation';
import { moduleRegistry } from '@nb/common/server/module-registry';
import { DynamicAdminPage } from '@nb/common/ui/dynamic-admin-page.component';

export default async function AuthDynamicPage({
  params,
}: {
  params: Promise<{ tenantId: string; slug?: string[] }>;
}) {
  const { tenantId, slug } = await params;
  const match = moduleRegistry.findPageRoute('/auth/' + (slug?.join('/') ?? ''));
  if (!match) notFound();
  return (
    <DynamicAdminPage
      componentId={match.route.componentId}
      tenantId={tenantId}
      params={match.params}
      slug={slug ?? []}
    />
  );
}
