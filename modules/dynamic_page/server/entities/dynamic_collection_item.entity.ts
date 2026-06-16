import 'reflect-metadata'
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm'
import { DynamicCollection } from './dynamic_collection.entity'

@Entity('dynamic_collection_items')
export class DynamicCollectionItem {
  @PrimaryGeneratedColumn('uuid', { name: 'itemId' })
  itemId!: string

  @Index()
  @Column({ type: 'uuid' })
  collectionId!: string

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string

  @Column({ type: 'jsonb', default: '{}' })
  data!: object

  @ManyToOne(() => DynamicCollection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collectionId' })
  collection?: DynamicCollection

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
