'use client';
import { useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';

// Public branding for a tenant, resolved from `/api/settings/public`. Every
// field defaults to '' so consumers can treat empty as "not configured" — and
// must NEVER fall back to the raw tenantId (UUID), which is not user-facing.
export type TenantBranding = {
  // Display name: explicit brand name wins, else the tenant's own name.
  name: string;
  tagline: string;
  logoLight: string;
  logoDark: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  authWallpaper: string;
  customCss: string;
  customJs: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
};

export const EMPTY_TENANT_BRANDING: TenantBranding = {
  name: '', tagline: '', logoLight: '', logoDark: '', favicon: '',
  primaryColor: '', secondaryColor: '', authWallpaper: '',
  customCss: '', customJs: '', privacyPolicyUrl: '', termsOfServiceUrl: '',
};

// Fetches the tenant's full public branding (name, logos, colors, wallpaper,
// legal links). Returns EMPTY_TENANT_BRANDING until loaded / on failure.
export function useTenantBranding(tenantId: string): TenantBranding {
  const [branding, setBranding] = useState<TenantBranding>(EMPTY_TENANT_BRANDING);

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/settings/public`)
      .then((res) => {
        const s = res.data?.settings ?? {};
        setBranding({
          name: s.brandName || res.data?.tenant?.name || '',
          tagline: s.brandTagline || '',
          logoLight: s.brandLogoLight || '',
          logoDark: s.brandLogoDark || '',
          favicon: s.brandFavicon || '',
          primaryColor: s.brandPrimaryColor || '',
          secondaryColor: s.brandSecondaryColor || '',
          authWallpaper: s.authWallpaper || '',
          customCss: s.customCss || '',
          customJs: s.customJs || '',
          privacyPolicyUrl: s.privacyPolicyUrl || '',
          termsOfServiceUrl: s.termsOfServiceUrl || '',
        });
      })
      .catch(() => setBranding(EMPTY_TENANT_BRANDING));
  }, [tenantId]);

  return branding;
}
