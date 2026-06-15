import 'reflect-metadata';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { FeatureFlag as FeatureFlagEntity } from './entities/feature_flag.entity';
import { FeatureFlagOverride as FeatureFlagOverrideEntity } from './entities/feature_flag_override.entity';
import {
  FeatureFlagSchema,
  FeatureFlagOverrideSchema,
  type FeatureFlag,
  type FeatureFlagOverride,
  type EvalContext,
  type EvalResult,
} from './feature_flags.types';
import type {
  CreateFlagInput,
  UpdateFlagInput,
  ListFlagsQueryInput,
  SetOverrideInput,
} from './feature_flags.dto';
import { FEATURE_FLAGS_MESSAGES as MSG } from './feature_flags.messages';
import { evaluateFlag } from './feature_flags.eval';

// Flags are read on (potentially) every request that gates a feature, but
// change only when an admin edits them — a read-through cache target. We cache
// the whole tenant flag-set (flags + overrides) under one key and invalidate on
// any write. TTL falls back to 5 min when env override is absent.
const FLAGS_CACHE_TTL = env.TENANT_CACHE_TTL ?? 60 * 5;

function cacheKey(tenantId: string): string {
  return `feature_flags:${tenantId}`;
}

interface CachedSet {
  flags: FeatureFlag[];
  overrides: FeatureFlagOverride[];
}

export default class FeatureFlagsService {
  // ── Reads ─────────────────────────────────────────────────────────────────

  /** Load (and cache) the full flag-set for a tenant. */
  private static async loadSet(tenantId: string): Promise<CachedSet> {
    const key = cacheKey(tenantId);
    const cached = await redis.get(key).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CachedSet;
        return {
          flags: parsed.flags.map((f) => FeatureFlagSchema.parse(f)),
          overrides: parsed.overrides.map((o) => FeatureFlagOverrideSchema.parse(o)),
        };
      } catch {
        await redis.del(key).catch(() => {});
      }
    }

    return singleFlight(key, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const [flagRows, overrideRows] = await Promise.all([
        ds.getRepository(FeatureFlagEntity).find({ where: { tenantId }, order: { key: 'ASC' } }),
        ds.getRepository(FeatureFlagOverrideEntity).find({ where: { tenantId } }),
      ]);
      const set: CachedSet = {
        flags: flagRows.map((f) => FeatureFlagSchema.parse(f)),
        overrides: overrideRows.map((o) => FeatureFlagOverrideSchema.parse(o)),
      };
      await redis.setex(key, jitter(FLAGS_CACHE_TTL), JSON.stringify(set)).catch(() => {});
      return set;
    });
  }

  private static async invalidate(tenantId: string): Promise<void> {
    await redis.del(cacheKey(tenantId)).catch(() => {});
  }

  static async list(
    tenantId: string,
    query: ListFlagsQueryInput,
  ): Promise<{ data: FeatureFlag[]; total: number }> {
    const { flags } = await this.loadSet(tenantId);
    const filtered =
      query.enabled === undefined ? flags : flags.filter((f) => f.enabled === query.enabled);
    const start = query.page * query.pageSize;
    return { data: filtered.slice(start, start + query.pageSize), total: filtered.length };
  }

  static async get(tenantId: string, key: string): Promise<FeatureFlag> {
    const { flags } = await this.loadSet(tenantId);
    const flag = flags.find((f) => f.key === key);
    if (!flag) throw new AppError(MSG.FLAG_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return flag;
  }

  /**
   * Evaluate one flag for a context. Unknown keys default to OFF (`not_found`)
   * — a missing flag is never silently on.
   */
  static async evaluate(tenantId: string, key: string, ctx: EvalContext): Promise<EvalResult> {
    const { flags, overrides } = await this.loadSet(tenantId);
    const flag = flags.find((f) => f.key === key);
    if (!flag) return { key, enabled: false, reason: 'not_found' };
    const flagOverrides = overrides.filter((o) => o.flagKey === key);
    return evaluateFlag(flag, flagOverrides, ctx);
  }

  /** Evaluate every flag for a context — handy for bootstrapping a client. */
  static async evaluateAll(tenantId: string, ctx: EvalContext): Promise<Record<string, boolean>> {
    const { flags, overrides } = await this.loadSet(tenantId);
    const out: Record<string, boolean> = {};
    for (const flag of flags) {
      const flagOverrides = overrides.filter((o) => o.flagKey === flag.key);
      out[flag.key] = evaluateFlag(flag, flagOverrides, ctx).enabled;
    }
    return out;
  }

  // ── Writes ──────────────────────────────────────────────────────────────────

  static async create(
    tenantId: string,
    input: CreateFlagInput,
    actorId?: string,
  ): Promise<FeatureFlag> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(FeatureFlagEntity);
    const existing = await repo.findOne({ where: { tenantId, key: input.key } });
    if (existing) throw new AppError(MSG.FLAG_KEY_TAKEN, 409, ErrorCode.CONFLICT);

    const row = repo.create({
      tenantId,
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      enabled: input.enabled,
      rolloutPercentage: input.rolloutPercentage,
      targetingRules: input.targetingRules ?? null,
      createdByUserId: actorId ?? null,
    });
    const saved = await repo.save(row);
    await this.invalidate(tenantId);
    this.audit(tenantId, actorId, 'feature_flag.created', input.key, { name: input.name });
    return FeatureFlagSchema.parse(saved);
  }

  static async update(
    tenantId: string,
    key: string,
    input: UpdateFlagInput,
    actorId?: string,
  ): Promise<FeatureFlag> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(FeatureFlagEntity);
    const row = await repo.findOne({ where: { tenantId, key } });
    if (!row) throw new AppError(MSG.FLAG_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description;
    if (input.enabled !== undefined) row.enabled = input.enabled;
    if (input.rolloutPercentage !== undefined) row.rolloutPercentage = input.rolloutPercentage;
    if (input.targetingRules !== undefined) row.targetingRules = input.targetingRules;

    const saved = await repo.save(row);
    await this.invalidate(tenantId);
    this.audit(tenantId, actorId, 'feature_flag.updated', key, {
      changedKeys: Object.keys(input),
    });
    return FeatureFlagSchema.parse(saved);
  }

  static async remove(tenantId: string, key: string, actorId?: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const result = await ds.getRepository(FeatureFlagEntity).delete({ tenantId, key });
    if (!result.affected) throw new AppError(MSG.FLAG_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    // Clean up dangling overrides for the removed flag.
    await ds.getRepository(FeatureFlagOverrideEntity).delete({ tenantId, flagKey: key });
    await this.invalidate(tenantId);
    this.audit(tenantId, actorId, 'feature_flag.deleted', key, {});
  }

  // ── Overrides ────────────────────────────────────────────────────────────────

  static async listOverrides(tenantId: string, key: string): Promise<FeatureFlagOverride[]> {
    const { overrides } = await this.loadSet(tenantId);
    return overrides.filter((o) => o.flagKey === key);
  }

  /** Upsert a per-subject override (idempotent on subjectType+subjectId). */
  static async setOverride(
    tenantId: string,
    key: string,
    input: SetOverrideInput,
    actorId?: string,
  ): Promise<FeatureFlagOverride> {
    const ds = await tenantDataSourceFor(tenantId);
    // Ensure the flag exists so overrides can't dangle from a typo.
    const flag = await ds
      .getRepository(FeatureFlagEntity)
      .findOne({ where: { tenantId, key } });
    if (!flag) throw new AppError(MSG.FLAG_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const repo = ds.getRepository(FeatureFlagOverrideEntity);
    let row = await repo.findOne({
      where: { tenantId, flagKey: key, subjectType: input.subjectType, subjectId: input.subjectId },
    });
    if (row) {
      row.enabled = input.enabled;
    } else {
      row = repo.create({
        tenantId,
        flagKey: key,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        enabled: input.enabled,
      });
    }
    const saved = await repo.save(row);
    await this.invalidate(tenantId);
    this.audit(tenantId, actorId, 'feature_flag.override_set', key, {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      enabled: input.enabled,
    });
    return FeatureFlagOverrideSchema.parse(saved);
  }

  static async removeOverride(
    tenantId: string,
    key: string,
    overrideId: string,
    actorId?: string,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const result = await ds
      .getRepository(FeatureFlagOverrideEntity)
      .delete({ tenantId, flagKey: key, overrideId });
    if (!result.affected) throw new AppError(MSG.OVERRIDE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await this.invalidate(tenantId);
    this.audit(tenantId, actorId, 'feature_flag.override_removed', key, { overrideId });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private static audit(
    tenantId: string,
    actorId: string | undefined,
    action: string,
    flagKey: string,
    metadata: Record<string, unknown>,
  ): void {
    AuditLogService.log({
      tenantId,
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId: actorId ?? null,
      action,
      resourceType: 'feature_flag',
      resourceId: flagKey,
      metadata: { tenantId, flagKey, ...metadata },
    });
  }
}
