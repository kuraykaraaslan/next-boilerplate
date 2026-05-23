import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Push subscription is tenant-scoped: the same physical browser endpoint
 * may be subscribed to multiple tenants the user belongs to. Composite
 * uniqueness on (tenantId, endpoint) lets the same endpoint be re-used
 * across tenants while preventing duplicates within a tenant.
 */
@Entity('push_subscriptions')
@Unique('UQ_push_sub_tenant_endpoint', ['tenantId', 'endpoint'])
@Unique('UQ_push_sub_tenant_user_endpoint', ['tenantId', 'userId', 'endpoint'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  endpoint!: string;

  @Column({ type: 'varchar' })
  p256dh!: string;

  @Column({ type: 'varchar' })
  auth!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
