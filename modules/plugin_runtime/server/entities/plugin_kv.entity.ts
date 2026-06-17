import 'reflect-metadata';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * The per-tenant, per-plugin key-value / document store — the ONLY persistence a
 * sandboxed plugin gets (`host.data`). Plugins never touch a DataSource; the broker
 * service reads/writes this table on their behalf, auto-scoping every row to
 * `(tenantId, pluginId)`. Carries a `tenantId` column so the marketplace uninstall
 * purge clears a tenant's plugin data.
 */
@Entity('plugin_kv')
export class PluginKv {
  @PrimaryColumn({ type: 'uuid' })
  tenantId!: string;

  @PrimaryColumn({ type: 'varchar' })
  pluginId!: string;

  @PrimaryColumn({ type: 'varchar' })
  collection!: string;

  @PrimaryColumn({ type: 'varchar' })
  key!: string;

  @Column({ type: 'jsonb' })
  value!: unknown;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
