import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * System-scoped SAML IdP config. Singleton — at most one row.
 *
 * Sits alongside the per-tenant `SamlConfig` so a system admin can let users
 * link a SAML identity from `/system/admin/me` without the tenant-SAML model.
 * Shape mirrors `SamlConfig` minus `tenantId`.
 */
@Entity('system_saml_configs')
export class SystemSamlConfig {
  @PrimaryGeneratedColumn('uuid', { name: 'systemSamlConfigId' })
  systemSamlConfigId!: string;

  @Column({ type: 'boolean', default: false })
  isEnabled!: boolean;

  // ── IdP settings ──────────────────────────────────────────────────────────
  @Column({ type: 'text', default: '' })
  idpEntityId!: string;

  @Column({ type: 'text', default: '' })
  idpSsoUrl!: string;

  @Column({ type: 'text', default: '' })
  idpCertificate!: string;

  // ── SP settings (auto-derived if empty) ───────────────────────────────────
  @Column({ type: 'text', nullable: true })
  spPrivateKey!: string | null;

  @Column({ type: 'text', nullable: true })
  spCertificate!: string | null;

  // ── Attribute mapping ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 255, default: 'email' })
  emailAttribute!: string;

  @Column({ type: 'varchar', length: 255, default: 'name' })
  nameAttribute!: string;

  // ── Options ───────────────────────────────────────────────────────────────
  @Column({ type: 'boolean', default: false })
  allowIdpInitiated!: boolean;

  @Column({ type: 'boolean', default: true })
  signRequests!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nameIdFormat!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
