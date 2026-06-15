import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * A single tenant-scoped product-analytics event. Append-only: rows are written
 * once on `track()` and never mutated, so there is no `updatedAt`. The composite
 * `(tenantId, name, createdAt)` index backs the GROUP BY aggregate queries
 * (summary / timeseries / top-events) without a per-tenant table scan.
 *
 * This is *product* behaviour (page views, signups, funnels) — distinct from
 * `metering` (usage-based billing) and `observability` (ops metrics).
 */
@Entity('analytics_events')
@Index('idx_analytics_tenant_name_created', ['tenantId', 'name', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'eventId' })
  eventId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // Event name, e.g. 'page_view', 'signup'. Indexed for per-name aggregates.
  @Index()
  @Column({ type: 'varchar' })
  name!: string;

  // The acting user when known. Null for anonymous visitors.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  // Stable client-supplied id for anonymous visitors (cookie/device).
  @Column({ type: 'varchar', nullable: true })
  anonymousId!: string | null;

  // Groups events from one browsing session.
  @Column({ type: 'varchar', nullable: true })
  sessionId!: string | null;

  // Arbitrary structured properties attached to the event.
  @Column({ type: 'jsonb', nullable: true })
  properties!: Record<string, unknown> | null;

  // Page path / referrer captured for page-view style events.
  @Column({ type: 'varchar', nullable: true })
  path!: string | null;

  @Column({ type: 'varchar', nullable: true })
  referrer!: string | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
