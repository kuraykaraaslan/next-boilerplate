import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Unique(['planId', 'key'])
@Entity('plan_features')
export class PlanFeature {
  @PrimaryGeneratedColumn('uuid', { name: 'featureId' })
  featureId!: string;

  @Index()
  @Column({ type: 'uuid' })
  planId!: string;

  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'varchar' })
  label!: string;

  @Column({ type: 'varchar', default: 'BOOLEAN' })
  type!: string;

  @Column({ type: 'varchar' })
  value!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
