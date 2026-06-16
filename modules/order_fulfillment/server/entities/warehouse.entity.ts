import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, Unique } from 'typeorm';

/**
 * A tenant fulfillment location / warehouse. Origin for shipments, customs
 * declarations, and multi-warehouse inventory routing.
 */
@Unique(['tenantId', 'code'])
@Entity('fulfillment_warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn('uuid', { name: 'warehouseId' })
  warehouseId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // Stable per-tenant code used as the warehouseStock map key in the store
  // module (e.g. "TR-IST", "DE-BER").
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Index()
  @Column({ type: 'varchar', length: 2 })
  country!: string;

  @Column({ nullable: true, type: 'varchar' })
  city?: string;

  @Column({ type: 'jsonb', nullable: true })
  address?: { line1?: string; line2?: string; postalCode?: string; region?: string };

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
