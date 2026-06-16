import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

/** Membership edge between a SCIM Group and a tenant member (User reference). */
@Unique(['tenantId', 'scimGroupId', 'tenantMemberId'])
@Entity('scim_group_members')
export class ScimGroupMember {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  scimGroupId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantMemberId!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
