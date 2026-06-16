import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * GTH-7 — Consent-at-registration record (GDPR Art. 7 / KVKK / LGPD Art. 8).
 *
 * One row per consent event so a tenant can prove *which version* of its
 * Terms of Service / Privacy Policy a user agreed to and *when*. Append-only:
 * a new consent (e.g. after a document version bump) inserts a new row rather
 * than mutating history. `tenantId` is nullable because self-registration may
 * happen before a tenant context is resolved.
 */
@Index('IDX_user_consents_user_created', ['userId', 'createdAt'])
@Entity('user_consents')
export class UserConsent {
  @PrimaryGeneratedColumn('uuid', { name: 'userConsentId' })
  userConsentId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  tenantId?: string | null;

  // Document the consent applies to (e.g. 'terms_of_service', 'privacy_policy').
  @Index()
  @Column({ type: 'varchar', default: 'terms_of_service' })
  documentType!: string;

  // Version string of the document the user agreed to (e.g. '2026-01-01', 'v3').
  @Column({ type: 'varchar' })
  documentVersion!: string;

  // Optional locale the document was presented in (LOI Toubon / KVKK language rules).
  @Column({ nullable: true, type: 'varchar' })
  locale?: string | null;

  @Column({ nullable: true, type: 'varchar' })
  ipAddress?: string | null;

  @Column({ nullable: true, type: 'text' })
  userAgent?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
