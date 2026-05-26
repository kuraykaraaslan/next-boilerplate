import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Unique(['tenantId', 'entityType', 'entityId'])
@Entity('media_galleries')
export class MediaGallery {
  @PrimaryGeneratedColumn('uuid', { name: 'galleryId' })
  galleryId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  entityType!: string;

  @Index()
  @Column({ type: 'uuid' })
  entityId!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
