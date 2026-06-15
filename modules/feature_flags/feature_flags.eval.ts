import { createHash } from 'node:crypto';
import type {
  EvalContext,
  EvalResult,
  FeatureFlag,
  FeatureFlagOverride,
  TargetingRule,
} from './feature_flags.types';

/**
 * Deterministic rollout bucket in [0,100) for a (flagKey, subject) pair. The
 * same subject always lands in the same bucket for a given flag, so raising
 * `rolloutPercentage` only ever *adds* subjects — nobody flips off as the
 * rollout grows. Different flags bucket independently (key is part of the hash).
 */
export function rolloutBucket(flagKey: string, subject: string): number {
  const digest = createHash('sha256').update(`${flagKey}:${subject}`).digest();
  // First 4 bytes → unsigned 32-bit int → modulo 100.
  const n = digest.readUInt32BE(0);
  return n % 100;
}

function attrToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Whether a single targeting rule matches the evaluation context. */
export function ruleMatches(rule: TargetingRule, ctx: EvalContext): boolean {
  const raw = ctx.attributes?.[rule.attribute];
  const actual = attrToString(raw);
  const values = rule.values;
  switch (rule.operator) {
    case 'eq':
      return actual === values[0];
    case 'neq':
      return actual !== values[0];
    case 'in':
      return values.includes(actual);
    case 'nin':
      return !values.includes(actual);
    case 'contains':
      return values.some((v) => actual.includes(v));
    default:
      return false;
  }
}

function pickOverride(
  overrides: FeatureFlagOverride[],
  ctx: EvalContext,
): FeatureFlagOverride | undefined {
  // User overrides take precedence over segment overrides.
  const userId = ctx.userId ?? undefined;
  if (userId) {
    const u = overrides.find((o) => o.subjectType === 'user' && o.subjectId === userId);
    if (u) return u;
  }
  for (const o of overrides) {
    if (o.subjectType !== 'segment') continue;
    // A segment override's subjectId is `attribute:value`, e.g. `plan:pro`.
    const [attr, ...rest] = o.subjectId.split(':');
    const want = rest.join(':');
    if (attr && attrToString(ctx.attributes?.[attr]) === want) return o;
  }
  return undefined;
}

/**
 * Evaluate a flag against a context. Precedence:
 *   master switch → explicit override → first matching rule → percentage rollout.
 * Pure: no I/O, fully unit-testable.
 */
export function evaluateFlag(
  flag: Pick<FeatureFlag, 'key' | 'enabled' | 'rolloutPercentage' | 'targetingRules'>,
  overrides: FeatureFlagOverride[],
  ctx: EvalContext,
): EvalResult {
  if (!flag.enabled) return { key: flag.key, enabled: false, reason: 'flag_disabled' };

  const override = pickOverride(overrides, ctx);
  if (override) return { key: flag.key, enabled: override.enabled, reason: 'override' };

  for (const rule of flag.targetingRules ?? []) {
    if (ruleMatches(rule, ctx)) return { key: flag.key, enabled: rule.enabled, reason: 'rule_match' };
  }

  if (flag.rolloutPercentage <= 0) return { key: flag.key, enabled: false, reason: 'rollout' };
  if (flag.rolloutPercentage >= 100) return { key: flag.key, enabled: true, reason: 'rollout' };

  const subject = ctx.userId || ctx.anonymousId || '';
  // No stable subject → can't bucket deterministically; treat as not-in-rollout.
  if (!subject) return { key: flag.key, enabled: false, reason: 'rollout' };

  const enabled = rolloutBucket(flag.key, subject) < flag.rolloutPercentage;
  return { key: flag.key, enabled, reason: 'rollout' };
}
