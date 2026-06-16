import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('trust_list_entries')
@Index('uq_trust_list_subject_key', ['country', 'subjectKeyIdentifier'], {
  unique: true,
  where: '"subjectKeyIdentifier" IS NOT NULL',
})
@Index('idx_trust_list_country_issuer', ['country', 'issuerDN'])
export class TrustListEntry {
  @PrimaryGeneratedColumn('uuid', { name: 'trustListEntryId' })
  trustListEntryId!: string;

  @Column({ type: 'char', length: 2 })
  country!: string;

  @Column({ type: 'text' })
  issuerDN!: string;

  @Column({ type: 'text' })
  certificatePem!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  subjectKeyIdentifier!: string | null;

  @Column({ type: 'timestamp' })
  notBefore!: Date;

  @Column({ type: 'timestamp' })
  notAfter!: Date;

  @Column({ type: 'varchar', length: 32 })
  source!: 'etsi_lotl' | 'tr_kamusm' | 'manual';

  @CreateDateColumn({ type: 'timestamp', name: 'fetchedAt' })
  fetchedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
