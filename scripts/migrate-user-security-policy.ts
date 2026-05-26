/**
 * KD-4 / KD-7: add password-rotation columns to user_securities.
 *
 * Adds (idempotent):
 *   - passwordHistory     jsonb     default '[]'
 *   - passwordChangedAt   timestamp nullable
 *   - mustChangePassword  boolean   default false
 *
 * Usage: npx tsx scripts/migrate-user-security-policy.ts
 *
 * Safe to re-run — checks each column before adding it.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { env } from '@/modules/env';

function parseDbUrl(raw: string): { url: string; schema?: string } {
  const match = raw.match(/[?&]schema=([^&]+)/);
  const schema = match?.[1];
  const url = raw.replace(/[?&]schema=[^&]+/, '').replace(/[?&]$/, '');
  return { url, schema };
}

const { url, schema } = parseDbUrl(env.DATABASE_URL);

const ds = new DataSource({
  type: 'postgres',
  url,
  schema,
  synchronize: false,
  entities: [],
  migrations: [],
});

async function columnExists(qr: any, table: string, column: string, schemaName?: string): Promise<boolean> {
  const rows: { exists: boolean }[] = await qr.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = $1
         AND column_name = $2
         AND ($3::text IS NULL OR table_schema = $3)
     ) AS exists`,
    [table, column, schemaName ?? null],
  );
  return rows[0]?.exists === true;
}

async function main() {
  await ds.initialize();
  const qr = ds.createQueryRunner();
  await qr.connect();

  const table = 'user_securities';
  const tableExists = await qr.hasTable(table);
  if (!tableExists) {
    console.log(`Table ${table} not found — run \`npm run dev\` once to provision via synchronize, then re-run this script.`);
    await qr.release();
    return;
  }

  const fullTable = schema ? `"${schema}"."${table}"` : `"${table}"`;

  if (!(await columnExists(qr, table, 'passwordHistory', schema))) {
    await qr.query(`ALTER TABLE ${fullTable} ADD COLUMN "passwordHistory" jsonb NOT NULL DEFAULT '[]'`);
    console.log(`+ ${table}.passwordHistory`);
  } else {
    console.log(`= ${table}.passwordHistory already present`);
  }

  if (!(await columnExists(qr, table, 'passwordChangedAt', schema))) {
    await qr.query(`ALTER TABLE ${fullTable} ADD COLUMN "passwordChangedAt" timestamp NULL`);
    console.log(`+ ${table}.passwordChangedAt`);
  } else {
    console.log(`= ${table}.passwordChangedAt already present`);
  }

  if (!(await columnExists(qr, table, 'mustChangePassword', schema))) {
    await qr.query(`ALTER TABLE ${fullTable} ADD COLUMN "mustChangePassword" boolean NOT NULL DEFAULT false`);
    console.log(`+ ${table}.mustChangePassword`);
  } else {
    console.log(`= ${table}.mustChangePassword already present`);
  }

  await qr.release();
  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => ds.destroy());
