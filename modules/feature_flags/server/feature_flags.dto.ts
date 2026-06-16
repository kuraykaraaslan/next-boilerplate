import { z } from 'zod';
import { TargetingRuleSchema } from './feature_flags.types';
import { OverrideSubjectTypeEnum } from './feature_flags.enums';

// Lowercase letters, digits, dash, underscore — stable across environments.
export const FlagKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Invalid flag key');

export const CreateFlagDTO = z.object({
  key: FlagKeySchema,
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
  targetingRules: z.array(TargetingRuleSchema).max(50).optional(),
});

export const UpdateFlagDTO = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  targetingRules: z.array(TargetingRuleSchema).max(50).nullable().optional(),
});

export const ListFlagsQuery = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  enabled: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const SetOverrideDTO = z.object({
  subjectType: OverrideSubjectTypeEnum,
  subjectId: z.string().min(1).max(256),
  enabled: z.boolean(),
});

export const EvaluateDTO = z.object({
  // Evaluate a single key, or omit to evaluate every flag for the context.
  key: FlagKeySchema.optional(),
  userId: z.string().max(256).optional(),
  anonymousId: z.string().max(256).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type CreateFlagInput = z.infer<typeof CreateFlagDTO>;
export type UpdateFlagInput = z.infer<typeof UpdateFlagDTO>;
export type ListFlagsQueryInput = z.infer<typeof ListFlagsQuery>;
export type SetOverrideInput = z.infer<typeof SetOverrideDTO>;
export type EvaluateInput = z.infer<typeof EvaluateDTO>;
