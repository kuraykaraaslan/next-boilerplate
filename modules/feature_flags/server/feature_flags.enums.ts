import { z } from 'zod';

// Operators a targeting rule may use to test a context attribute against its
// configured values. `in` matches membership; `contains` matches substring.
export const RuleOperatorEnum = z.enum(['eq', 'neq', 'in', 'nin', 'contains']);
export type RuleOperator = z.infer<typeof RuleOperatorEnum>;

// Subject a per-flag override targets.
export const OverrideSubjectTypeEnum = z.enum(['user', 'segment']);
export type OverrideSubjectType = z.infer<typeof OverrideSubjectTypeEnum>;

// Why a given evaluation returned its result — surfaced for debugging/audit.
export const EvalReasonEnum = z.enum([
  'flag_disabled', // master switch off
  'not_found', // no such flag → default
  'override', // an explicit subject override applied
  'rule_match', // a targeting rule matched
  'rollout', // percentage bucket decision
]);
export type EvalReason = z.infer<typeof EvalReasonEnum>;
