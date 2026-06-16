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

  // IdP Single Logout (SLO) endpoint. When set, platform logout can propagate
  // a LogoutRequest to the IdP and the SP exposes an SLO endpoint that accepts
  // IdP-initiated LogoutRequests/Responses.
  @Column({ type: 'text', default: '' })
  idpSloUrl!: string;

  // URL of the IdP's published SAML metadata XML (Azure AD / Okta / ADFS expose
  // one). Used by the "import from URL" feature to pre-fill the IdP fields.
  @Column({ type: 'text', default: '' })
  idpMetadataUrl!: string;

  // Parsed `notAfter` of the IdP signing certificate (computed on upsert).
  // Used by the expiry-monitoring path to emit an audit + metric when the IdP
  // cert is near or past expiry. Null when the cert could not be parsed.
  @Column({ type: 'timestamp', nullable: true })
  idpCertNotAfter?: Date | null;

  // ── SP settings (auto-derived from tenantId if empty) ─────────────────────
  // The platform auto-generates a unique self-signed SP key pair on first
  // upsertConfig when these are empty (per-tenant SP identity).
  @Column({ type: 'text', nullable: true })
  spPrivateKey!: string | null;

  @Column({ type: 'text', nullable: true })
  spCertificate!: string | null;

  // ── Certificate rotation (dual-cert) ──────────────────────────────────────
  // Secondary SP key/cert slot. During a rotation rollover both the primary and
  // the secondary cert are published in SP metadata so the IdP accepts either,
  // giving a zero-downtime cert swap. Promote secondary → primary when done.
  @Column({ type: 'text', nullable: true })
  spPrivateKeySecondary!: string | null;

  @Column({ type: 'text', nullable: true })
  spCertificateSecondary!: string | null;

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

  // ── ABAC role mapping ─────────────────────────────────────────────────────
  // Ordered list of attribute→role rules evaluated before the simple
  // owner/admin substring scan. Each rule matches a value of `attribute`
  // (supports multi-value memberOf/DN attributes) and maps to a member role.
  // Stored as JSON; shape validated by `SamlRoleMappingRuleSchema`.
  @Column({ type: 'jsonb', nullable: true })
  roleMappingRules?: unknown | null;

  // ── Options ───────────────────────────────────────────────────────────────
  @Column({ type: 'boolean', default: false })
  allowIdpInitiated!: boolean;

  @Column({ type: 'boolean', default: true })
  signRequests!: boolean;

  // Per-tenant XML-DSig signature algorithm ('sha1' | 'sha256' | 'sha512').
  // Some legacy IdPs require sha1; high-assurance IdPs require sha512.
  @Column({ type: 'varchar', length: 16, default: 'sha256' })
  signatureAlgorithm!: string;

  // Per-tenant accepted clock-skew tolerance (ms) for assertion timestamp
  // validation. On-premise ADFS behind strict firewalls often needs 30-60s.
  @Column({ type: 'integer', default: 5000 })
  clockSkewMs!: number;

  // Per-tenant "require signed assertions" posture. Defaults strict (true).
  @Column({ type: 'boolean', default: true })
  wantAssertionsSigned!: boolean;

  // When true, the platform session minted after a SAML callback is capped at
  // the assertion's `SessionNotOnOrAfter` (IdP-governed max session lifetime).
  @Column({ type: 'boolean', default: true })
  honorSessionNotOnOrAfter!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nameIdFormat!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
