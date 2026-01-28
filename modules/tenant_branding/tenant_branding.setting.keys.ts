import { z } from 'zod';

// ============================================================================
// Tenant Branding Setting Keys
// ============================================================================

export const TenantBrandingSettingKeySchema = z.enum([
  'brandName', 'brandTagline', 'brandLogoLight', 'brandLogoDark',
  'brandFavicon', 'brandPrimaryColor', 'brandSecondaryColor',
  'authWallpaper', 'customCss', 'customJs',
]);
export type TenantBrandingSettingKey = z.infer<typeof TenantBrandingSettingKeySchema>;
export const TENANT_BRANDING_KEYS = TenantBrandingSettingKeySchema.options;
