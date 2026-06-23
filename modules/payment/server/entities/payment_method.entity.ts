import 'reflect-metadata';
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';

/**
 * Configurable payment method (master-data). Tenant-scoped catalogue of the
 * methods an operator offers at checkout, each optionally bound to a gateway.
 */
@Entity('payment_methods')
export class PaymentMethodConfig {
  @PrimaryGeneratedColumn('uuid', { name: 'methodId' })
  methodId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Index()
  @Column({ type: 'varchar' })
  code!: string;

  @Column({ type: 'varchar', nullable: true })
  gateway?: string;

  @Column({ type: 'boolean', default: false })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
