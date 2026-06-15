/**
 * TypeORM CLI data source for running migrations.
 *
 * Usage:
 *   npx typeorm-ts-node-commonjs migration:run -d modules/db/db.migration-datasource.ts
 *   npx typeorm-ts-node-commonjs migration:generate -d modules/db/db.migration-datasource.ts -n MigrationName
 *   npx typeorm-ts-node-commonjs migration:revert  -d modules/db/db.migration-datasource.ts
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { parseDbUrl } from './db.utils';
import { ENTITIES } from './db';

// Migrations are DDL: prefer the direct (unpooled) connection — a PgBouncer /
// Neon pooled connection is transaction-scoped and unsuited to migrations.
const DATABASE_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('[db.migration-datasource] DATABASE_URL (or DATABASE_URL_UNPOOLED) is required');

const { url, schema } = parseDbUrl(DATABASE_URL);

export const MigrationDataSource = new DataSource({
  type: 'postgres',
  url,
  schema,
  synchronize: false,
  logging: ['migration', 'error'],
  entities: ENTITIES,
  migrations: ['modules/db/migrations/*.ts'],
});

export default MigrationDataSource;
