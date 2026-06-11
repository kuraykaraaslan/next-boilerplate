import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity('fulfillments')
export class Fulfillment {
  @PrimaryGeneratedColumn('uuid', { name: 'fulfillmentId' })
  fulfillmentId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // references an order in a future order module
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string;

  @Index()
  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @Column({ nullable: true, type: 'varchar' })
  carrier?: string;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  trackingNumber?: string;

  @Column({ nullable: true, type: 'varchar' })
  trackingUrl?: string;

  // optional reference to a shipping method in the payment_shipping module
  @Column({ nullable: true, type: 'uuid' })
  shippingMethodId?: string;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @Column({ nullable: true, type: 'timestamp' })
  packedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  shippedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  deliveredAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  cancelledAt?: Date;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
