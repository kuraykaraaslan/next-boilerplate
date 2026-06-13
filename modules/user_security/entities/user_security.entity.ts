import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_securities')
export class UserSecurity {
  @PrimaryGeneratedColumn('uuid', { name: 'userSecurityId' })
  userSecurityId!: string;

  @Column({ unique: true, type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: ['EMAIL', 'SMS', 'TOTP_APP'], array: true, default: '{}' })
  otpMethods!: string[];

  @Column({ nullable: true, type: 'varchar' })
  otpSecret?: string;

  @Column({ type: 'jsonb', default: '[]' })
  otpBackupCodes!: unknown[];

  @Column({ nullable: true, type: 'timestamp' })
  lastLoginAt?: Date;

  @Column({ nullable: true, type: 'varchar' })
  lastLoginIp?: string;

  @Column({ nullable: true, type: 'varchar' })
  lastLoginDevice?: string;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ nullable: true, type: 'timestamp' })
  lockedUntil?: Date;

  @Column({ type: 'boolean', default: false })
  passkeyEnabled!: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  passkeys!: unknown[];

  // ── Trusted devices (remember-this-device) — only SHA-256 token hashes ──
  @Column({ type: 'jsonb', default: '[]' })
  trustedDevices!: unknown[];

  // ── KD-7: password rotation history ─────────────────────────────────────
  @Column({ type: 'jsonb', default: '[]' })
  passwordHistory!: unknown[];

  @Column({ nullable: true, type: 'timestamp' })
  passwordChangedAt?: Date;

  // ── KD-4: force password change on next login ──────────────────────────
  @Column({ type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
