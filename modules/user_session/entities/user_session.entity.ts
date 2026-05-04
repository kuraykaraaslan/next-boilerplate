import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid', { name: 'userSessionId' })
  userSessionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'text' })
  accessToken!: string;

  @Index()
  @Column({ type: 'text' })
  refreshToken!: string;

  @Column({ nullable: true, type: 'varchar' })
  deviceFingerprint?: string;

  @Column({ nullable: true, type: 'text' })
  userAgent?: string;

  @Column({ nullable: true, type: 'varchar' })
  ipAddress?: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  sessionStatus!: string;

  @Column({ type: 'boolean', default: false })
  otpVerifyNeeded!: boolean;

  @Column({ type: 'timestamp' })
  sessionExpiry!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  setUpdatedAt() {
    this.updatedAt = new Date();
  }
}
