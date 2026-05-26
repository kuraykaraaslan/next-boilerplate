import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
