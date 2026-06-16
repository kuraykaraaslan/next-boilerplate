'use client';
import { Suspense, type ComponentType, type ReactNode } from 'react';
import { moduleRegistry, type RuntimeSlotContribution } from '@nb/common/server/module-registry';
import type { ModuleScope } from '@nb/common/server/module-manifest.types';
import { moduleComponents } from './generated/module-components';
import { useModuleEnabled } from './module-enabled.context';
import { SlotErrorBoundary } from './SlotErrorBoundary';

export interface ResolvedContribution {
  id: string;
  componentId: string;
  moduleId: string;
  Component: ComponentType<Record<string, unknown>>;
  props: Record<string, unknown>;
}

/**
 * Resolve the live contributions for a named slot (filtered by the enabled set
 * from context + optional scope). For data-driven hosts (e.g. a TabGroup whose
 * `tabs` is an array) that need to weave contributions into their own markup.
 */
export function useSlotContributions(name: string, scope?: ModuleScope): ResolvedContribution[] {
  const enabledIds = useModuleEnabled();
  const contributions = moduleRegistry.getSlotContributions(name, { enabledIds, scope });
  return contributions
    .map((c: RuntimeSlotContribution) => {
      const Component = moduleComponents[c.componentId] as ComponentType<Record<string, unknown>> | undefined;
      if (!Component) return null;
      return { id: c.id, componentId: c.componentId, moduleId: c.moduleId, Component, props: c.props };
    })
    .filter((x): x is ResolvedContribution => x !== null);
}

/**
 * Render every component contributed to `name`. Each contribution is wrapped in
 * its own Suspense + error boundary so one slow/broken plugin can't block or
 * crash the host. When there are no contributions, renders `children`/`fallback`.
 */
export function Slot({
  name,
  scope,
  fallback = null,
  children,
  ...passthrough
}: {
  name: string;
  scope?: ModuleScope;
  fallback?: ReactNode;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  const contributions = useSlotContributions(name, scope);
  if (contributions.length === 0) return <>{children ?? fallback}</>;
  return (
    <>
      {contributions.map(({ id, componentId, Component, props }) => (
        <SlotErrorBoundary key={id} slot={name} component={componentId} fallback={fallback}>
          <Suspense fallback={fallback}>
            <Component {...props} {...passthrough} />
          </Suspense>
        </SlotErrorBoundary>
      ))}
    </>
  );
}
