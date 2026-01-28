import { create } from 'zustand'
import { useEffect } from 'react'
import type { TenantBrandingState } from '@/modules/tenant_branding/tenant_branding.types'

type TenantBrandingStore = TenantBrandingState & {
  setTenantId: (tenantId: string | null) => void
  loadBranding: (tenantId: string) => Promise<void>
  clearBranding: () => void
}

export const useTenantBrandingStore = create<TenantBrandingStore>((set, get) => ({
  tenantId: null,
  branding: {},
  isLoading: false,
  error: null,

  setTenantId: (tenantId) => {
    const current = get().tenantId
    if (current !== tenantId) {
      set({ tenantId })
      if (tenantId) {
        get().loadBranding(tenantId)
      } else {
        get().clearBranding()
      }
    }
  },

  loadBranding: async (tenantId) => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch(`/tenant/${tenantId}/api/settings/public`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load branding')
      }

      set({
        branding: data.settings,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.message,
        isLoading: false,
      })
    }
  },

  clearBranding: () => {
    set({
      tenantId: null,
      branding: {},
      error: null,
    })
  },
}))

/**
 * Hook to automatically load branding when tenantId changes
 */
export function useTenantBranding(tenantId: string | null) {
  const { setTenantId, branding, isLoading, error } = useTenantBrandingStore()

  useEffect(() => {
    setTenantId(tenantId)
  }, [tenantId, setTenantId])

  return { branding, isLoading, error }
}

export default useTenantBrandingStore
