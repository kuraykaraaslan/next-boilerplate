import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, Unique } from 'typeorm';

@Unique(['tenantId', 'userId'])
@Entity('tenant_members')
export class TenantMember {
  @PrimaryGeneratedColumn('uuid', { name: 'tenantMemberId' })
  tenantMemberId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', default: 'USER' })
  memberRole!: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  memberStatus!: string;

  @Column({ type: 'int', default: 0 })
  sessionVersion!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
