import { z } from 'zod';
import { RuleOperatorEnum, OverrideSubjectTypeEnum, EvalReasonEnum } from './feature_flags.enums';

// A single attribute-based targeting rule. `attribute` is read from the
// evaluation context's `attributes` bag; `values` are compared per `operator`.
export const TargetingRuleSchema = z.object({
  attribute: z.string().min(1).max(64),
  operator: RuleOperatorEnum,
  values: z.array(z.string().max(256)).min(1).max(100),
  // Result to return when this rule matches. Defaults to on.
  enabled: z.boolean().default(true),
});
export type TargetingRule = z.infer<typeof TargetingRuleSchema>;

export const FeatureFlagSchema = z.object({
  flagId: z.string().uuid(),
  tenantId: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100),
  targetingRules: z.array(TargetingRuleSchema).nullable(),
  createdByUserId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const FeatureFlagOverrideSchema = z.object({
  overrideId: z.string().uuid(),
  tenantId: z.string().uuid(),
  flagKey: z.string(),
  subjectType: OverrideSubjectTypeEnum,
  subjectId: z.string(),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
});
export type FeatureFlagOverride = z.infer<typeof FeatureFlagOverrideSchema>;

// Context a caller supplies when evaluating a flag. `userId` drives `user`
// overrides + rollout bucketing; `attributes` drive targeting rules and
// `segment` overrides.
export interface EvalContext {
  userId?: string | null;
  // Stable key used for rollout bucketing when no userId (e.g. an anonymousId).
  anonymousId?: string | null;
  attributes?: Record<string, string | number | boolean | null | undefined>;
}

export interface EvalResult {
  key: string;
  enabled: boolean;
  reason: z.infer<typeof EvalReasonEnum>;
}
