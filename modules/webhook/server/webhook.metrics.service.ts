import 'reflect-metadata';
import { tenantDataSourceFor } from '@nb/db';
import { WebhookDelivery as WebhookDeliveryEntity } from './entities/webhook_delivery.entity';
import { WebhookDeliverySchema } from './webhook.types';
import type { WebhookDelivery, WebhookMetrics } from './webhook.types';
import type { ListDeliveriesInput } from './webhook.dto';

/**
 * Read-side queries over `webhook_deliveries`: paginated delivery listing and
 * aggregate delivery metrics. Split out of {@link WebhookService} so the
 * Postgres-specific reporting stays isolated from the dispatch/delivery path.
 */
export default class WebhookMetricsService {

  static async listDeliveries({ tenantId, webhookId, page, pageSize }: ListDeliveriesInput): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const [rows, total] = await ds.getRepository(WebhookDeliveryEntity).findAndCount({
      where: { tenantId, webhookId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { deliveries: rows.map((r) => WebhookDeliverySchema.parse(r)), total };
  }

  /**
   * Aggregate delivery metrics from `webhook_deliveries` for a tenant (optionally
   * one webhook / a time window): counts by status, success rate over terminal
   * deliveries, avg + p95 duration, and a per-event breakdown. Postgres-specific
   * (`PERCENTILE_CONT`, `FILTER`).
   */
  static async getMetrics(
    tenantId: string,
    opts: { webhookId?: string; since?: Date } = {},
  ): Promise<WebhookMetrics> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WebhookDeliveryEntity);

    const scoped = () => {
      const qb = repo.createQueryBuilder('d').where('d."tenantId" = :tenantId', { tenantId });
      if (opts.webhookId) qb.andWhere('d."webhookId" = :webhookId', { webhookId: opts.webhookId });
      if (opts.since) qb.andWhere('d."createdAt" >= :since', { since: opts.since });
      return qb;
    };

    const statusRaw = await scoped()
      .select('d."status"', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d."status"')
      .getRawMany<{ status: string; count: string }>();

    const byStatus: Record<string, number> = {};
    for (const r of statusRaw) byStatus[r.status] = Number(r.count);
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const success = byStatus.SUCCESS ?? 0;
    const terminal = success + (byStatus.DEAD_LETTERED ?? 0) + (byStatus.FAILED ?? 0);
    const successRate = terminal > 0 ? success / terminal : null;

    const durRaw = await scoped()
      .andWhere('d."duration" IS NOT NULL')
      .select('AVG(d."duration")', 'avg')
      .addSelect('PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY d."duration")', 'p95')
      .getRawOne<{ avg: string | null; p95: string | null }>();

    const eventRaw = await scoped()
      .select('d."event"', 'event')
      .addSelect('COUNT(*)', 'count')
      .addSelect(`COUNT(*) FILTER (WHERE d."status" = 'SUCCESS')`, 'success')
      .groupBy('d."event"')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany<{ event: string; count: string; success: string }>();

    return {
      total,
      byStatus,
      successRate,
      avgDurationMs: durRaw?.avg != null ? Math.round(Number(durRaw.avg)) : null,
      p95DurationMs: durRaw?.p95 != null ? Math.round(Number(durRaw.p95)) : null,
      byEvent: eventRaw.map((r) => ({ event: r.event, count: Number(r.count), success: Number(r.success) })),
    };
  }
}
