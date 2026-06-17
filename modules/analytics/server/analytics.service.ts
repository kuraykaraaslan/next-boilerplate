import 'reflect-metadata';
import type { Repository } from 'typeorm';
import redis, { jitter, singleFlight } from '@kuraykaraaslan/redis';
import { env } from '@kuraykaraaslan/env';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { AnalyticsEvent as AnalyticsEventEntity } from './entities/analytics_event.entity';
import type { TimeInterval } from './analytics.enums';
import type { AnalyticsSummary, EventCount, TimeseriesPoint } from './analytics.types';
import type { TrackEventInput } from './analytics.dto';
import { ANALYTICS_MESSAGES as MSG } from './analytics.messages';
import { fillTimeseriesGaps } from './analytics.timeseries';

// Summaries scan the whole range and are read far more than the underlying
// events change, so they're worth a short cache. Default 60s when no env TTL.
const SUMMARY_CACHE_TTL = env.TENANT_CACHE_TTL ?? 60;
const DEFAULT_RANGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface Range {
  from: Date;
  to: Date;
}

/** Apply defaults (last 30 days → now) and validate ordering. */
function resolveRange(from?: Date, to?: Date): Range {
  const resolvedTo = to ?? new Date();
  const resolvedFrom = from ?? new Date(resolvedTo.getTime() - DEFAULT_RANGE_MS);
  if (resolvedFrom.getTime() > resolvedTo.getTime()) {
    throw new AppError(MSG.INVALID_RANGE, 400, ErrorCode.VALIDATION_ERROR);
  }
  return { from: resolvedFrom, to: resolvedTo };
}

function summaryCacheKey(tenantId: string, r: Range): string {
  return `analytics:summary:${tenantId}:${r.from.getTime()}:${r.to.getTime()}`;
}

export default class AnalyticsService {
  /**
   * Append one event. Validates a non-empty name, then awaits the save so the
   * caller can fire-and-forget at the route layer while still surfacing errors.
   * Returns the new event id.
   */
  static async track(tenantId: string, input: TrackEventInput): Promise<string> {
    const name = input.name?.trim();
    if (!name) throw new AppError(MSG.EVENT_NAME_REQUIRED, 400, ErrorCode.VALIDATION_ERROR);

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AnalyticsEventEntity);
    const row = repo.create({
      tenantId,
      name,
      userId: input.userId ?? null,
      anonymousId: input.anonymousId ?? null,
      sessionId: input.sessionId ?? null,
      properties: input.properties ?? null,
      path: input.path ?? null,
      referrer: input.referrer ?? null,
    });
    const saved = await repo.save(row);
    return saved.eventId;
  }

  /**
   * Top-line aggregate over a range: total events, unique users, unique
   * sessions, and the top events by count. Cached in Redis for ~60s per
   * (tenant, range).
   */
  static async summary(
    tenantId: string,
    { from, to }: { from?: Date; to?: Date },
  ): Promise<AnalyticsSummary> {
    const range = resolveRange(from, to);
    const key = summaryCacheKey(tenantId, range);

    const cached = await redis.get(key).catch(() => null);
    if (cached) {
      try {
        return JSON.parse(cached) as AnalyticsSummary;
      } catch {
        await redis.del(key).catch(() => {});
      }
    }

    return singleFlight(key, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AnalyticsEventEntity);

      const [totals] = await repo
        .createQueryBuilder('e')
        .select('COUNT(*)', 'totalEvents')
        .addSelect('COUNT(DISTINCT e.userId)', 'uniqueUsers')
        .addSelect('COUNT(DISTINCT e.sessionId)', 'uniqueSessions')
        .where('e.tenantId = :tenantId', { tenantId })
        .andWhere('e.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
        .getRawMany();

      const topEvents = await this.topEventsQuery(repo, tenantId, range, 10);

      const result: AnalyticsSummary = {
        totalEvents: parseInt(totals?.totalEvents ?? '0', 10),
        uniqueUsers: parseInt(totals?.uniqueUsers ?? '0', 10),
        uniqueSessions: parseInt(totals?.uniqueSessions ?? '0', 10),
        topEvents,
      };
      await redis
        .setex(key, jitter(SUMMARY_CACHE_TTL), JSON.stringify(result))
        .catch(() => {});
      return result;
    });
  }

  /**
   * Counts grouped by `date_trunc(interval, createdAt)`, returned as a dense
   * series (missing buckets filled with 0) via {@link fillTimeseriesGaps}.
   */
  static async timeseries(
    tenantId: string,
    {
      name,
      from,
      to,
      interval = 'day',
    }: { name?: string; from?: Date; to?: Date; interval?: TimeInterval },
  ): Promise<TimeseriesPoint[]> {
    const range = resolveRange(from, to);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AnalyticsEventEntity);

    const qb = repo
      .createQueryBuilder('e')
      .select('date_trunc(:interval, e.createdAt)', 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .setParameter('interval', interval);
    if (name) qb.andWhere('e.name = :name', { name });

    const rows = await qb
      .groupBy('date_trunc(:interval, e.createdAt)')
      .orderBy('date_trunc(:interval, e.createdAt)', 'ASC')
      .getRawMany();

    const points = rows.map((r) => ({
      bucket: new Date(r.bucket as string).toISOString(),
      count: parseInt(r.count, 10),
    }));
    return fillTimeseriesGaps(points, range.from, range.to, interval);
  }

  /** Top events by count over a range. */
  static async topEvents(
    tenantId: string,
    { from, to, limit = 10 }: { from?: Date; to?: Date; limit?: number },
  ): Promise<EventCount[]> {
    const range = resolveRange(from, to);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(AnalyticsEventEntity);
    return this.topEventsQuery(repo, tenantId, range, limit);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private static async topEventsQuery(
    repo: Repository<AnalyticsEventEntity>,
    tenantId: string,
    range: Range,
    limit: number,
  ): Promise<EventCount[]> {
    const rows = await repo
      .createQueryBuilder('e')
      .select('e.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.createdAt BETWEEN :from AND :to', { from: range.from, to: range.to })
      .groupBy('e.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();
    return rows.map((r) => ({ name: r.name as string, count: parseInt(r.count, 10) }));
  }
}
