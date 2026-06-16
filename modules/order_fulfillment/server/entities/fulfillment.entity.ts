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

  // Origin warehouse + country (multi-warehouse routing, customs origin).
  @Index()
  @Column({ nullable: true, type: 'uuid' })
  warehouseId?: string;

  @Column({ nullable: true, type: 'varchar', length: 2 })
  originCountry?: string;

  // Link to a payment_return_rma return request when this shipment is returned.
  @Column({ nullable: true, type: 'uuid' })
  returnRequestId?: string;

  // Platform-hosted branded tracking token (tenant.com/track/{token}).
  @Index({ unique: true })
  @Column({ nullable: true, type: 'varchar' })
  publicTrackingToken?: string;

  // SLA / promised delivery date.
  @Column({ nullable: true, type: 'timestamp' })
  estimatedDeliveryAt?: Date | null;

  // Split-shipment: true when this shipment covers only part of the order.
  @Column({ type: 'boolean', default: false })
  isPartial!: boolean;

  // Customs / export documentation fields.
  @Column({ nullable: true, type: 'decimal', precision: 8, scale: 3, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  weightKg?: number | null;

  @Column({ type: 'jsonb', nullable: true })
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  declaredValue?: number | null;

  @Column({ nullable: true, type: 'varchar', length: 3 })
  customsCurrency?: string;

  @Column({ type: 'jsonb', nullable: true })
  customsData?: unknown;

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

  @Column({ nullable: true, type: 'timestamp' })
  returnedAt?: Date;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
