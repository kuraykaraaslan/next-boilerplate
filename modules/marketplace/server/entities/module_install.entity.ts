import 'reflect-metadata';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Per-tenant record that a module has been *installed* from the marketplace.
 * Existence of a row = installed; the `module.<id>.enabled` setting decides
 * active vs inactive. Deleting the row (+ purging the module's tenant data) is
 * a full uninstall.
 *
 * Tenant isolation is via the `tenantId` column (like every other tenant-scoped
 * table here) — NOT a Postgres schema. The registry labels it tenant-scoped from
 * that column; the marketplace purge keys off `hasTenantId`, not the label.
 */
@Entity('module_installs')
export class ModuleInstall {
  @PrimaryColumn({ type: 'uuid' })
  tenantId!: string;

  @PrimaryColumn({ type: 'varchar' })
  moduleId!: string;

  /** Manifest version recorded at install time. */
  @Column({ type: 'varchar' })
  version!: string;

  @CreateDateColumn({ type: 'timestamp' })
  installedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
