import 'reflect-metadata';
import 'dotenv/config';
import { Client } from 'pg';
import { env } from '@/modules/env';
import { parseDbUrl } from '@/modules/db/db.utils';

async function resetSchema(databaseUrl: string, label: string) {
  const { url, schema } = parseDbUrl(databaseUrl);
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.query(`CREATE SCHEMA "${schema}"`);
    console.log(`Reset ${label} schema "${schema}".`);
  } finally {
    await client.end();
  }
}

async function main() {
  await resetSchema(env.DATABASE_URL, 'db');
  console.log('Done. Next `npm run dev` will recreate tables from entities.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
