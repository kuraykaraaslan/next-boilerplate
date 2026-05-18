import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('signing_certificates')
@Index('uq_signing_certificates_fingerprint', ['certFingerprintSha256'], { unique: true })
@Index('idx_signing_certificates_user', ['userId'])
export class SigningCertificate {
  @PrimaryGeneratedColumn('uuid', { name: 'signingCertificateId' })
  signingCertificateId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  providerName!: string;

  @Column({ type: 'char', length: 2 })
  country!: string;

  @Column({ type: 'varchar', length: 128 })
  certFingerprintSha256!: string;

  @Column({ type: 'varchar', length: 64 })
  certSerialHex!: string;

  @Column({ type: 'text' })
  issuerDN!: string;

  @Column({ type: 'text' })
  subjectDN!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  commonName!: string | null;

  // SHA-256 of the plaintext national identifier (e.g. TC Kimlik No, EE personal code).
  // The plaintext is never persisted.
  @Column({ type: 'varchar', length: 128, nullable: true })
  nationalIdHash!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'high' })
  loa!: 'low' | 'substantial' | 'high';

  @Column({ type: 'timestamp' })
  notBefore!: Date;

  @Column({ type: 'timestamp' })
  notAfter!: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'boundAt' })
  boundAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
