import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('tenant_domains')
export class TenantDomain {
  @PrimaryGeneratedColumn('uuid', { name: 'tenantDomainId' })
  tenantDomainId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', unique: true })
  domain!: string;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ type: 'varchar', default: 'PENDING' })
  domainStatus!: string;

  @Column({ nullable: true, type: 'varchar' })
  verificationToken?: string;

  @Column({ nullable: true, type: 'timestamp' })
  verifiedAt?: Date;

  // ─── SSL / TLS certificate state ───────────────────────────────────────────
  // The cert itself is provisioned by an external reverse proxy (Caddy /
  // Traefik / cert-manager) via Let's Encrypt — this entity stores only
  // observability fields that the platform admin can see.
  //
  // - sslStatus: lifecycle  DISABLED → PENDING → ACTIVE → EXPIRING → FAILED
  // - sslIssuedAt / sslExpiresAt: parsed from the leaf cert on TLS handshake
  // - sslIssuer: e.g. "Let's Encrypt Authority X3"
  // - sslLastCheckedAt: when the daily cron last ran a handshake against this
  //                     host. Helps the admin distinguish "we haven't checked
  //                     yet" from "we checked and it really is broken".

  @Column({ type: 'varchar', default: 'DISABLED' })
  sslStatus!: string;

  @Column({ nullable: true, type: 'timestamp' })
  sslIssuedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  sslExpiresAt?: Date;

  @Column({ nullable: true, type: 'varchar' })
  sslIssuer?: string;

  @Column({ nullable: true, type: 'timestamp' })
  sslLastCheckedAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
