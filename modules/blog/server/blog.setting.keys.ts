import { z } from 'zod'

// ============================================================================
// Tenant Blog Setting Keys
// ----------------------------------------------------------------------------
// Read per-tenant at runtime via SettingService.getValue(tenantId, key).
// Values are stored as strings ('true' / 'false'); see DEFAULTS for fallbacks.
// ============================================================================

export const BlogTenantSettingKeySchema = z.enum([
  // If 'false', a comment must carry a userId (no anonymous comments).
  'blogAllowAnonymousComments',
  // If 'true', new comments start NOT_PUBLISHED and require moderation.
  'blogCommentModeration',
])
export type BlogTenantSettingKey = z.infer<typeof BlogTenantSettingKeySchema>
export const BLOG_TENANT_KEYS = BlogTenantSettingKeySchema.options

/** Defaults applied when a tenant has not set the key. */
export const BLOG_SETTING_DEFAULTS: Record<BlogTenantSettingKey, boolean> = {
  blogAllowAnonymousComments: true,
  blogCommentModeration: true,
}
