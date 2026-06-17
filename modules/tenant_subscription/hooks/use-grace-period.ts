'use client';
import { useState, useEffect } from 'react';
import axiosInstance from '@kuraykaraaslan/common/server/axios';
import type { GracePeriodStatus } from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.types';

type UseGracePeriodState = {
  status: GracePeriodStatus | null;
  loading: boolean;
  error: string | null;
};

export function useGracePeriod(tenantId: string): UseGracePeriodState {
  const [state, setState] = useState<UseGracePeriodState>({
    status: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!tenantId) {
      setState({ status: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    axiosInstance
      .get<{ success: boolean; status: GracePeriodStatus }>(
        `/tenant/${tenantId}/api/subscription/grace-period`,
      )
      .then((res) => {
        setState({ status: res.data.status, loading: false, error: null });
      })
      .catch((err) => {
        setState({
          status: null,
          loading: false,
          error: err?.response?.data?.message ?? err.message ?? 'Failed to fetch grace period status',
        });
      });
  }, [tenantId]);

  return state;
}
