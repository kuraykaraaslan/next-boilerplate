import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'userId' })
  userId!: string;

  @Index()
  @Column({ unique: true, type: 'varchar' })
  email!: string;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  phone?: string;

  @Column({ type: 'varchar' })
  password!: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  userStatus!: string;

  @Column({ type: 'varchar', default: 'USER' })
  userRole!: string;

  @Column({ nullable: true, type: 'timestamp' })
  emailVerifiedAt?: Date;

  // GDPR / KVKK / LGPD consent captured at registration (Art. 7 GDPR, Art. 8 LGPD).
  @Column({ nullable: true, type: 'varchar' })
  consentVersion?: string;

  @Column({ nullable: true, type: 'timestamp' })
  consentAcceptedAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
