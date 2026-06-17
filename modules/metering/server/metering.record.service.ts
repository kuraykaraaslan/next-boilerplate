import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import redis from '@kuraykaraaslan/redis';
import Logger from '@kuraykaraaslan/logger';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import { MeteredUsageEvent as MeteredUsageEventEntity } from './entities/metered_usage_event.entity';
import MeterCrudService from './metering.meter.service';
import { MeteredUsageEventSchema, type MeteredUsageEvent, type MeterUsageReading } from './metering.types';
import type { GetUsageQuery, RecordUsageDTO } from './metering.dto';
import { METERING_MESSAGES as MESSAGES } from './metering.messages';
import {
  periodKeyFor,
  usageCounterKey,
  USAGE_COUNTER_TTL_SECONDS,
} from './metering.constants';

/**
 * Records immutable usage events and serves period totals. Writes are
 * idempotent on `idempotencyKey`; a best-effort Redis hot counter accelerates
 * current-period reads, with the DB events as the authoritative fallback.
 */
export default class MeteringRecordService {
  /**
   * Record one usage event against a meter.
   *  - validates the meter exists (by key) and is active,
   *  - replays idempotently on `idempotencyKey` (returns the existing event),
   *  - derives the UTC `YYYY-MM` periodKey from `occurredAt`,
   *  - bumps the Redis hot counter (fail-open if Redis is down),
   *  - fires the `metering.usage.recorded` webhook (fire-and-forget).
   */
  static async recordEvent(tenantId: string, dto: RecordUsageDTO): Promise<MeteredUsageEvent> {
    const meter = await MeterCrudService.getMeterByKey(tenantId, dto.meterKey);
    if (!meter.active) {
      throw new AppError(MESSAGES.METER_INACTIVE, 409, ErrorCode.CONFLICT);
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const periodKey = periodKeyFor(occurredAt);
    const subjectId = dto.subjectId ?? null;
    const quantity = BigInt(dto.quantity);

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MeteredUsageEventEntity);

    // ── Idempotent replay ────────────────────────────────────────────────────
    if (dto.idempotencyKey) {
      const existing = await repo.findOne({
        where: { tenantId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return MeteredUsageEventSchema.parse(existing);
    }

    let saved: MeteredUsageEventEntity;
    try {
      saved = await repo.save(
        repo.create({
          tenantId,
          meterId: meter.meterId,
          meterKey: meter.key,
          subjectType: dto.subjectType,
          subjectId,
          quantity,
          idempotencyKey: dto.idempotencyKey ?? null,
          occurredAt,
          periodKey,
          metadata: dto.metadata ?? null,
        }),
      );
    } catch (error) {
      // Lost an idempotency race — the unique partial index rejected the dup.
      if ((error as { code?: string }).code === '23505' && dto.idempotencyKey) {
        const row = await repo.findOne({
          where: { tenantId, idempotencyKey: dto.idempotencyKey },
        });
        if (row) return MeteredUsageEventSchema.parse(row);
      }
      Logger.error(`${MESSAGES.RECORD_FAILED}: ${error}`);
      throw error instanceof AppError
        ? error
        : new AppError(MESSAGES.RECORD_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }

    // ── Best-effort hot counter (fail-open) ──────────────────────────────────
    const key = usageCounterKey(tenantId, meter.key, periodKey, subjectId);
    try {
      await redis.incrby(key, Number(quantity));
      await redis.expire(key, USAGE_COUNTER_TTL_SECONDS);
    } catch {
      // Redis down must not block usage recording; DB remains authoritative.
    }

    // ── Fire-and-forget webhook ──────────────────────────────────────────────
    void WebhookService.dispatchEvent(tenantId, 'metering.usage.recorded', {
      usageEventId: saved.usageEventId,
      meterKey: meter.key,
      subjectType: dto.subjectType,
      subjectId,
      quantity: quantity.toString(),
      periodKey,
    }).catch((err) => Logger.error(`[metering] webhook dispatch failed: ${err}`));

    return MeteredUsageEventSchema.parse(saved);
  }

  /**
   * Authoritative period total from the DB events, honouring the meter's
   * aggregation: SUM = sum of quantities, MAX = the single highest quantity,
   * LAST = the quantity of the most recent event by `occurredAt`.
   */
  static async aggregate(
    tenantId: string,
    meterKey: string,
    periodKey: string,
    subjectId?: string | null,
  ): Promise<bigint> {
    const ds = await tenantDataSourceFor(tenantId);
    const meter = await MeterCrudService.getMeterByKey(tenantId, meterKey);

    const where: Record<string, unknown> = { tenantId, meterKey, periodKey };
    if (subjectId !== undefined) where.subjectId = subjectId;

    const events = await ds.getRepository(MeteredUsageEventEntity).find({
      where,
      order: { occurredAt: 'ASC' },
    });
    if (events.length === 0) return BigInt(0);

    switch (meter.aggregation) {
      case 'MAX':
        return events.reduce((m, e) => (e.quantity > m ? e.quantity : m), BigInt(0));
      case 'LAST': {
        // Events are ordered by occurredAt ASC — the last one is the newest.
        // Break occurredAt ties deterministically by createdAt.
        const sorted = [...events].sort((a, b) => {
          const t = a.occurredAt.getTime() - b.occurredAt.getTime();
          return t !== 0 ? t : a.createdAt.getTime() - b.createdAt.getTime();
        });
        return sorted[sorted.length - 1].quantity;
      }
      case 'SUM':
      default:
        return events.reduce((acc, e) => acc + e.quantity, BigInt(0));
    }
  }

  /**
   * Per-meter current (or given) period usage. Redis-first for SUM meters
   * (cheap hot counter), with a DB fallback whenever Redis misses or the meter
   * aggregation is not a plain sum (MAX/LAST can't be derived from a counter).
   */
  static async getUsage(
    tenantId: string,
    query: GetUsageQuery,
  ): Promise<{ periodKey: string; data: MeterUsageReading[] }> {
    const periodKey = query.periodKey ?? periodKeyFor();
    const subjectId = query.subjectId ?? null;

    const meters = query.meterKey
      ? [await MeterCrudService.getMeterByKey(tenantId, query.meterKey)]
      : await MeterCrudService.listActiveMeters(tenantId);

    const data: MeterUsageReading[] = [];
    for (const meter of meters) {
      let used: bigint | null = null;
      let source: 'redis' | 'db' = 'db';

      // Redis hot path only valid for additive (SUM) counters.
      if (meter.aggregation === 'SUM') {
        try {
          const raw = await redis.get(usageCounterKey(tenantId, meter.key, periodKey, subjectId));
          if (raw !== null && /^-?\d+$/.test(raw)) {
            used = BigInt(raw);
            source = 'redis';
          }
        } catch {
          // fall through to DB
        }
      }

      if (used === null) {
        used = await MeteringRecordService.aggregate(
          tenantId,
          meter.key,
          periodKey,
          query.subjectId !== undefined ? subjectId : undefined,
        );
        source = 'db';
      }

      data.push({
        meterKey: meter.key,
        meterId: meter.meterId,
        name: meter.name,
        unit: meter.unit,
        aggregation: meter.aggregation,
        periodKey,
        usedQuantity: used.toString(),
        includedQuantity: meter.includedQuantity,
        source,
      });
    }

    return { periodKey, data };
  }
}
