/**
 * Run once to create the api_keys table in the tenant database.
 * Usage: npx tsx scripts/migrate-api-keys.ts
 */
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, Table, TableIndex } from 'typeorm';
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

async function main() {
  await ds.initialize();
  const qr = ds.createQueryRunner();
  await qr.connect();

  const tableExists = await qr.hasTable('api_keys');
  if (tableExists) {
    console.log('Table api_keys already exists — skipping.');
    await qr.release();
    return;
  }

  await qr.createTable(
    new Table({
      name: 'api_keys',
      columns: [
        { name: 'apiKeyId',         type: 'uuid',        isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
        { name: 'tenantId',         type: 'uuid',        isNullable: false },
        { name: 'createdByUserId',  type: 'uuid',        isNullable: false },
        { name: 'name',             type: 'varchar',     isNullable: false },
        { name: 'description',      type: 'text',        isNullable: true },
        { name: 'keyHash',          type: 'varchar',     isNullable: false, isUnique: true },
        { name: 'keyPrefix',        type: 'varchar',     isNullable: false },
        { name: 'scopes',           type: 'text',        isNullable: false, default: "''" },
        { name: 'isActive',         type: 'boolean',     isNullable: false, default: true },
        { name: 'lastUsedAt',       type: 'timestamp',   isNullable: true },
        { name: 'expiresAt',        type: 'timestamp',   isNullable: true },
        { name: 'createdAt',        type: 'timestamp',   isNullable: false, default: 'now()' },
        { name: 'updatedAt',        type: 'timestamp',   isNullable: false, default: 'now()' },
      ],
    }),
    true,
  );

  await qr.createIndex(
    'api_keys',
    new TableIndex({ name: 'IDX_api_keys_tenantId', columnNames: ['tenantId'] }),
  );

  await qr.release();
  console.log('Table api_keys created successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => ds.destroy());
