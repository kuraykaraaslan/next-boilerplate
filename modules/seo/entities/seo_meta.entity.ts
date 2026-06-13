import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index, Unique } from 'typeorm';

@Unique(['tenantId', 'entityType', 'entityId'])
@Entity('seo_meta')
export class SeoMeta {
  @PrimaryGeneratedColumn('uuid', { name: 'seoId' })
  seoId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  entityType!: string;

  @Index()
  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ nullable: true, type: 'varchar', length: 200 })
  title?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  keywords?: string[];

  @Column({ nullable: true, type: 'varchar', length: 200 })
  ogTitle?: string;

  @Column({ nullable: true, type: 'text' })
  ogDescription?: string;

  @Column({ nullable: true, type: 'varchar' })
  ogImageUrl?: string;

  @Column({ nullable: true, type: 'varchar' })
  canonicalUrl?: string;

  @Column({ nullable: true, type: 'varchar', length: 200 })
  twitterTitle?: string;

  @Column({ nullable: true, type: 'text' })
  twitterDescription?: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  twitterCard?: string;

  // Per-locale overrides for title/description/OG/canonical, keyed by BCP-47
  // locale: { "de": { ogTitle, ogDescription, canonicalUrl, ... }, ... }
  @Column({ type: 'jsonb', nullable: true })
  localized?: Record<string, Record<string, string>>;

  // hreflang alternates: locale → absolute URL of that locale's variant.
  @Column({ type: 'jsonb', nullable: true })
  alternates?: Record<string, string>;

  // x-default hreflang target (language-chooser / default-locale URL).
  @Column({ nullable: true, type: 'varchar' })
  xDefaultUrl?: string;

  @Column({ type: 'boolean', default: false })
  noIndex!: boolean;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
