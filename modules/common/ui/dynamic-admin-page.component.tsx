'use client';
import { Suspense, useMemo, type ComponentType } from 'react';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { moduleComponents } from './generated/module-components';

/**
 * Client loader for the catch-all dynamic admin route. Lazy-resolves the module
 * page component (by id) from the generated component map and renders it.
 *
 * Module pages keep the exact same signature as Next.js app pages —
 * `({ params }: { params: Promise<{ tenantId; ...routeParams }> })` consumed via
 * React `use()` — so a page can be moved into its module verbatim. We hand it a
 * memoized resolved promise of { tenantId, ...routeParams }. The owning module's
 * enabled-state and 404 handling are decided server-side before this mounts.
 */
export function DynamicAdminPage({
  componentId,
  tenantId,
  params,
}: {
  componentId: string;
  tenantId: string;
  params: Record<string, string>;
  slug: string[];
}) {
  const Component = moduleComponents[componentId] as
    | ComponentType<{ params: Promise<Record<string, string>> }>
    | undefined;
  const paramsPromise = useMemo(
    () => Promise.resolve({ tenantId, ...params }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantId, JSON.stringify(params)],
  );
  if (!Component) return null;
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg" /></div>}>
      <Component params={paramsPromise} />
    </Suspense>
  );
}
