'use client';
import { Suspense, type ComponentType } from 'react';
import { Spinner } from '@nb/common/ui/Spinner';
import { moduleComponents } from './generated/module-components';

/**
 * Client loader for the catch-all dynamic admin route. Lazy-resolves the module
 * page component (by id) from the generated component map and renders it with
 * the tenant id + remaining path segments. The owning module's enabled-state and
 * 404 handling are decided server-side in the catch-all page before this mounts.
 */
export function DynamicAdminPage({
  componentId,
  tenantId,
  slug,
}: {
  componentId: string;
  tenantId: string;
  slug: string[];
}) {
  const Component = moduleComponents[componentId] as
    | ComponentType<{ tenantId: string; slug: string[] }>
    | undefined;
  if (!Component) return null;
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg" /></div>}>
      <Component tenantId={tenantId} slug={slug} />
    </Suspense>
  );
}
