'use client';
import { useState, useEffect } from 'react';
import axiosInstance from '@/modules_next/common/axios';
import type { FeatureAccessResult } from '@/modules/tenant_subscription/tenant_subscription.types';

type UseFeatureAccessState = {
  result: FeatureAccessResult | null;
  loading: boolean;
  error: string | null;
};

/**
 * Fetches feature access for the given key from the tenant subscription API.
 * Re-fetches when tenantId, featureKey, or count change.
 *
 * @param tenantId  - The tenant to check
 * @param featureKey - Feature key from FEATURE_KEYS constants
 * @param count     - Current usage count (for LIMIT features)
 */
export function useFeatureAccess(
  tenantId: string,
  featureKey: string,
  count?: number,
): UseFeatureAccessState {
  const [state, setState] = useState<UseFeatureAccessState>({
    result: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!tenantId || !featureKey) {
      setState({ result: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = new URLSearchParams({ key: featureKey });
    if (count !== undefined) params.set('count', String(count));

    axiosInstance
      .get<{ success: boolean; result: FeatureAccessResult }>(
        `/tenant/${tenantId}/api/subscription/features?${params.toString()}`,
      )
      .then((res) => {
        setState({ result: res.data.result, loading: false, error: null });
      })
      .catch((err) => {
        setState({
          result: null,
          loading: false,
          error: err?.response?.data?.message ?? err.message ?? 'Failed to check feature access',
        });
      });
  }, [tenantId, featureKey, count]);

  return state;
}
