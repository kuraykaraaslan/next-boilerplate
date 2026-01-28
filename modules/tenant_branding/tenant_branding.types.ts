import { z } from 'zod'

export const TenantBrandingSchema = z.object({
  brandName: z.string().optional(),
  brandTagline: z.string().optional(),
  brandLogoLight: z.string().optional(),
  brandLogoDark: z.string().optional(),
  brandFavicon: z.string().optional(),
  brandPrimaryColor: z.string().optional(),
  brandSecondaryColor: z.string().optional(),
  authWallpaper: z.string().optional(),
  customCss: z.string().optional(),
  customJs: z.string().optional(),
})
export type TenantBranding = z.infer<typeof TenantBrandingSchema>

export const TenantBrandingStateSchema = z.object({
  tenantId: z.string().nullable(),
  branding: TenantBrandingSchema,
  isLoading: z.boolean(),
  error: z.string().nullable(),
})
export type TenantBrandingState = z.infer<typeof TenantBrandingStateSchema>
