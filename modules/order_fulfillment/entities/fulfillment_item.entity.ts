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

  // Quantity still backordered / awaiting restock for this line.
  @Column({ type: 'int', default: 0 })
  backorderedQuantity!: number;

  // Customs / export per-line fields.
  @Column({ nullable: true, type: 'varchar', length: 14 })
  hsCode?: string;

  @Column({ nullable: true, type: 'varchar', length: 2 })
  countryOfOrigin?: string;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  unitValue?: number | null;

  // Dangerous-goods (ADR / IATA DGR) classification.
  @Column({ type: 'boolean', default: false })
  isDangerousGoods!: boolean;

  @Column({ nullable: true, type: 'varchar', length: 20 })
  hazmatClass?: string;

  @Column({ nullable: true, type: 'varchar', length: 10 })
  unNumber?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
