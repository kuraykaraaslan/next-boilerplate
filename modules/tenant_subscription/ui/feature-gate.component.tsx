'use client';
import type { FeatureAccessResult } from '@nb/tenant_subscription/server/tenant_subscription.types';
import { UpgradePrompt } from './upgrade-prompt.component';

type Props = {
  result: FeatureAccessResult | null | undefined;
  tenantId: string;
  children: React.ReactNode;
  /**
   * Custom fallback shown when access is denied.
   * Defaults to <UpgradePrompt> if omitted.
   */
  fallback?: React.ReactNode;
  /**
   * When true, renders nothing instead of the upgrade prompt on denial.
   */
  silent?: boolean;
};

/**
 * FeatureGate — renders children when feature access is allowed,
 * otherwise shows UpgradePrompt (or custom fallback).
 *
 * Pass a pre-fetched FeatureAccessResult (from server or hook).
 * null/undefined result is treated as loading — renders nothing.
 */
export function FeatureGate({ result, tenantId, children, fallback, silent = false }: Props) {
  if (result == null) return null;

  if (result.allowed) return <>{children}</>;

  if (silent) return null;

  return (
    <>
      {fallback ?? <UpgradePrompt result={result} tenantId={tenantId} />}
    </>
  );
}
