'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * The set of currently-enabled module ids for the active tenant. Provided high
 * in the admin tree (the layout fetches it server-side and passes it down).
 * When no provider is present, the value is `undefined`, which the registry
 * treats as "no enabled-filtering" — every module's contributions are shown.
 */
const ModuleEnabledContext = createContext<Set<string> | undefined>(undefined);

export function ModuleEnabledProvider({
  enabledIds,
  children,
}: {
  enabledIds: string[] | Set<string> | undefined;
  children: ReactNode;
}) {
  const value = useMemo(
    () => (enabledIds === undefined ? undefined : enabledIds instanceof Set ? enabledIds : new Set(enabledIds)),
    [enabledIds],
  );
  return <ModuleEnabledContext.Provider value={value}>{children}</ModuleEnabledContext.Provider>;
}

/** The enabled-module set, or undefined when unscoped (show everything). */
export function useModuleEnabled(): Set<string> | undefined {
  return useContext(ModuleEnabledContext);
}
