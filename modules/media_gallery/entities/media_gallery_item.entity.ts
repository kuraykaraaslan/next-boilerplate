import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UploadedFile } from '@/modules/storage/entities/uploaded_file.entity';

/**
 * Gallery-side wrapper around an UploadedFile audit row.
 *
 * The actual bytes (url, key, mimeType, size, bucket, provider) live on
 * UploadedFile — this row only carries gallery-specific overlay
 * (sortOrder, isPrimary, altText, title) plus the FK that joins them.
 */
@Entity('media_gallery_items')
export class MediaGalleryItem {
  @PrimaryGeneratedColumn('uuid', { name: 'itemId' })
  itemId!: string;

  @Index()
  @Column({ type: 'uuid' })
  galleryId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  uploadedFileId!: string;

  @ManyToOne(() => UploadedFile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploadedFileId' })
  uploadedFile?: UploadedFile;

  @Column({ nullable: true, type: 'varchar' })
  altText?: string;

  @Column({ nullable: true, type: 'varchar' })
  title?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  // Free-form tags for tag-based gallery search.
  @Column({ type: 'jsonb', nullable: true })
  tags?: string[] | null;

  // Exact-content dedup (sha256 of the bytes) + perceptual hash (near-dup).
  @Index()
  @Column({ nullable: true, type: 'varchar', length: 64 })
  contentHash?: string | null;

  @Index()
  @Column({ nullable: true, type: 'varchar', length: 64 })
  perceptualHash?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  // Soft delete + restore.
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date | null;
}
