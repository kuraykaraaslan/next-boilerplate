import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { parseDbUrl } from '@/modules/db/db.utils';
import { ENTITIES } from '@/modules/db';

/**
 * One-off production schema bootstrap: create all tables from the TypeORM
 * entities over the direct (unpooled) connection. Use this once after pointing
 * DATABASE_URL at a fresh database when `synchronize` is off (production).
 *
 *   npx tsx scripts/db-sync.ts
 *
 * Idempotent: re-running only applies missing/changed schema. Does NOT seed
 * data — run `npm run tenant:seed-root` afterwards.
 */
const raw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!raw) throw new Error('[db-sync] DATABASE_URL (or DATABASE_URL_UNPOOLED) is required');

const { url, schema } = parseDbUrl(raw);

const ds = new DataSource({
  type: 'postgres',
  url,
  schema,
  entities: ENTITIES,
  synchronize: true,
  logging: ['error', 'schema'],
});

ds.initialize()
  .then(async () => {
    console.log('Schema synchronized.');
    await ds.destroy();
    process.exit(0);
  })
  .catch((err) => {
    console.error('[db-sync] failed:', err);
    process.exit(1);
  });
