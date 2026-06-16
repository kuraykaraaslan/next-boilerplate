import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity('shipping_methods')
export class ShippingMethod {
  @PrimaryGeneratedColumn('uuid', { name: 'shippingMethodId' })
  shippingMethodId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  // Tenant-scoped human code (e.g. 'standard', 'express'). Indexed for lookups.
  @Index()
  @Column({ type: 'varchar' })
  code!: string;

  // Carrier identifier: 'ARAS','YURTICI','MNG','PTT','UPS','FEDEX','DHL','TNT','CUSTOM'
  @Column({ nullable: true, type: 'varchar' })
  carrier?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
