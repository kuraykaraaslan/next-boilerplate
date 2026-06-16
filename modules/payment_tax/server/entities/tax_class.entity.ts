import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity('tax_classes')
export class TaxClass {
  @PrimaryGeneratedColumn('uuid', { name: 'taxClassId' })
  taxClassId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // Human-readable name, e.g. 'Standard', 'Reduced', 'Zero', 'Digital Goods'
  @Column({ type: 'varchar' })
  name!: string;

  // Machine code, e.g. 'STANDARD', 'REDUCED', 'ZERO', 'EXEMPT', 'DIGITAL'
  @Index()
  @Column({ type: 'varchar' })
  code!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  // When true, this class is applied to lines that do not specify a taxClassCode.
  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
