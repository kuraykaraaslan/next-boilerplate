/**
 * TypeORM CLI data source for running migrations.
 *
 * Run through tsx (resolves TS + the `@/*` tsconfig path alias; the plain
 * `typeorm` CLI does neither). Convenience npm scripts wrap these:
 *   npm run db:migration:generate -- modules/db/migrations/100_init
 *   npm run db:migration:run
 *   npm run db:migration:revert
 *
 * Or directly:
 *   npx tsx ./node_modules/typeorm/cli.js migration:run -d modules/db/db.migration-datasource.ts
 */
import 'reflect-metadata';
// Must run before `./db` (which transitively imports `@/modules/env`) so .env is
// loaded before env validation executes at import time.
import 'dotenv/config';

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
