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

  // Name of the SAML attribute that holds the user's role (e.g. 'role',
  // 'memberOf', 'groups'). Optional — when unset, JIT-provisioned users get
  // the `defaultMemberRole`. The value is matched case-insensitively against
  // 'owner' / 'admin' substrings; everything else falls back to 'USER'.
  @Column({ type: 'varchar', length: 255, nullable: true })
  roleAttribute?: string | null;

  // ── Just-In-Time (JIT) provisioning ───────────────────────────────────────
  // When true, an SSO assertion for an unknown email (or a known user with
  // no membership in this tenant) auto-creates the user and/or membership.
  // When false, callbacks for unknown users redirect to login with an error.
  @Column({ type: 'boolean', default: false })
  allowJitProvisioning!: boolean;

  // Role assigned to JIT-provisioned members when the SAML assertion carries
  // no usable role attribute. Defaults to 'USER' at the service layer.
  @Column({ type: 'varchar', length: 64, nullable: true })
  defaultMemberRole?: string | null;

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
