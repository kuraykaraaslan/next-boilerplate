import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('tenant_invitations')
export class TenantInvitation {
  @PrimaryGeneratedColumn('uuid', { name: 'invitationId' })
  invitationId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'uuid' })
  invitedByUserId!: string;

  @Column({ type: 'varchar', default: 'USER' })
  memberRole!: string;

  @Index()
  @Column({ type: 'varchar', unique: true })
  token!: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
