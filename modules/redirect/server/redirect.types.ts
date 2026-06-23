import { z } from 'zod'

// ============================================================================
// RedirectRule
// ============================================================================

export const RedirectRuleSchema = z.object({
  redirectId: z.string().uuid(),
  tenantId: z.string().uuid(),
  fromPath: z.string(),
  toPath: z.string(),
  statusCode: z.number().int(),
  isActive: z.boolean(),
  hits: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type RedirectRule = z.infer<typeof RedirectRuleSchema>

export const SafeRedirectRuleSchema = RedirectRuleSchema.omit({ deletedAt: true })
export type SafeRedirectRule = z.infer<typeof SafeRedirectRuleSchema>
