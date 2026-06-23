import { z } from 'zod'

// ============================================================================
// RedirectRule DTOs
// ============================================================================

export const CreateRedirectRuleDTO = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  statusCode: z.coerce.number().int().default(301),
  isActive: z.boolean().optional().default(false),
})
export type CreateRedirectRuleDTO = z.infer<typeof CreateRedirectRuleDTO>
export type CreateRedirectRuleInput = CreateRedirectRuleDTO

export const UpdateRedirectRuleDTO = CreateRedirectRuleDTO.partial()
export type UpdateRedirectRuleDTO = z.infer<typeof UpdateRedirectRuleDTO>

export const GetRedirectRulesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetRedirectRulesQuery = z.infer<typeof GetRedirectRulesQuery>
