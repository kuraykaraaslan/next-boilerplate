import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('return_items')
export class ReturnItem {
  @PrimaryGeneratedColumn('uuid', { name: 'returnItemId' })
  returnItemId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  returnRequestId!: string;

  // references an order item in a future order module
  @Column({ nullable: true, type: 'uuid' })
  orderItemId?: string;

  @Column({ nullable: true, type: 'uuid' })
  productId?: string;

  @Column({ nullable: true, type: 'uuid' })
  variantId?: string;

  @Column({ nullable: true, type: 'varchar' })
  sku?: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ nullable: true, type: 'varchar' })
  reason?: string;

  // physical condition of the returned item, e.g. 'UNOPENED', 'USED', 'DAMAGED'
  @Column({ nullable: true, type: 'varchar' })
  condition?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
