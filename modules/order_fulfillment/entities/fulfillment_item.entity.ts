import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('fulfillment_items')
export class FulfillmentItem {
  @PrimaryGeneratedColumn('uuid', { name: 'fulfillmentItemId' })
  fulfillmentItemId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  fulfillmentId!: string;

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

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
