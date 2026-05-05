import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('saml_configs')
export class SamlConfig {
  @PrimaryGeneratedColumn('uuid', { name: 'samlConfigId' })
  samlConfigId!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'boolean', default: false })
  isEnabled!: boolean;

  // ── IdP settings ──────────────────────────────────────────────────────────
  @Column({ type: 'text', default: '' })
  idpEntityId!: string;

  @Column({ type: 'text', default: '' })
  idpSsoUrl!: string;

  // PEM or raw base64 certificate from the IdP (for signature verification)
  @Column({ type: 'text', default: '' })
  idpCertificate!: string;

  // ── SP settings (auto-derived from tenantId if empty) ─────────────────────
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
