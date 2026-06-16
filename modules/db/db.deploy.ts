import 'reflect-metadata';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcrypt';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { parseDbUrl } from '@/modules/db/db.utils';
import { ENTITIES } from '@/modules/db';
import { ROOT_TENANT_ID, ROOT_TENANT_NAME } from '@/modules/tenant/tenant.constants';
import { User } from '@/modules/user/entities/user.entity';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import { TenantDomain } from '@/modules/tenant_domain/entities/tenant_domain.entity';
import { Setting } from '@/modules/setting/entities/setting.entity';

/**
 * Shared deploy pipeline — the three idempotent phases used by both the
 * build-time `scripts/db-deploy.ts` and the serverless demo-reset cron. Three
 * phases, all run over the direct (unpooled) connection:
 *
 *   1. Schema sync   — create/alter tables from the TypeORM entities
 *                      (`synchronize`). This is what creates `tenant_databases`
 *                      et al. in production, where the runtime DataSource keeps
 *                      `synchronize: false`.
 *   2. SQL migrations — apply every `modules/db/migrations/*.sql` file in
 *                      numbered order exactly once, tracked in a
 *                      `_sql_migrations` table so re-runs are no-ops.
 *   3. Bootstrap seed — ONLY on a fresh database (no tenant rows): create the
 *                      PLATFORM (root) and ACME (demo) tenants plus their admin
 *                      users. Skipped entirely once any tenant exists, so it
 *                      never touches an established database.
 *
 * `dropSchema()` adds the destructive reset used by demo mode: it wipes the
 * schema so the subsequent `deployDatabase()` rebuilds everything and the seed
 * runs in full again.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'modules/db/migrations');

// Demo bootstrap credentials. Change these in production after the first login.
export const SEED_USERS = {
  sysadmin: { email: 'sysadmin@kuray.dev', password: 'sysadmin123456' },
  acmeAdmin: { email: 'admin@kuray.dev', password: 'admin123456' },
  acmeUser: { email: 'user@kuray.dev', password: 'user123456' },
} as const;
const ACME_TENANT_ID = '00000000-0000-4000-8000-000000000001';
const ACME_TENANT_NAME = 'Acme Corp';

/**
 * Resolve the direct (unpooled) database connection. Returns null when no
 * database is configured so callers can skip rather than fail.
 */
export function resolveDeployTarget(): { url: string; schema?: string } | null {
  const raw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!raw) return null;
  return parseDbUrl(raw);
}

/**
 * Destructive: drop and recreate the target schema, wiping all data. Used only
 * by demo mode — guarded by callers behind DEMO_MODE.
 */
export async function dropSchema(target: { url: string; schema?: string }): Promise<void> {
  const { url, schema } = target;
  const schemaName = schema || 'public';
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    console.log(`[db-deploy] dropped and recreated schema "${schemaName}".`);
  } finally {
    await client.end();
  }
}

async function syncSchema(target: { url: string; schema?: string }): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    url: target.url,
    schema: target.schema,
    entities: ENTITIES,
    synchronize: true,
    logging: ['error', 'schema'],
  });
  await ds.initialize();
  try {
    console.log('[db-deploy] schema synchronized from entities.');
  } finally {
    await ds.destroy();
  }
}

async function applySqlMigrations(target: { url: string; schema?: string }): Promise<void> {
  const { url, schema } = target;
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) return;

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    if (schema) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
    }
    await client.query(
      `CREATE TABLE IF NOT EXISTS _sql_migrations (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );

    const { rows } = await client.query<{ name: string }>('SELECT name FROM _sql_migrations');
    const applied = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[db-deploy] skip ${file} (already applied).`);
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[db-deploy] applying ${file} ...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _sql_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[db-deploy] applied ${file}.`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`[db-deploy] migration ${file} failed: ${(err as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
}

/**
 * Bootstrap seed — runs ONLY when the database has no tenants yet, so it is a
 * true first-deploy step and never mutates an established database.
 *
 *   PLATFORM (root tenant)   → sysadmin@kuray.dev   ADMIN (super-admin)
 *   ACME     (demo tenant)   → admin@kuray.dev      OWNER
 *                              user@kuray.dev       USER
 */
async function seedIfFresh(target: { url: string; schema?: string }): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    url: target.url,
    schema: target.schema,
    entities: ENTITIES,
    synchronize: false,
    logging: ['error'],
  });
  await ds.initialize();
  try {
    const tenantRepo = ds.getRepository(Tenant);
    const tenantCount = await tenantRepo.count();
    if (tenantCount > 0) {
      console.log(`[db-deploy] ${tenantCount} tenant(s) present — skipping bootstrap seed.`);
      return;
    }

    console.log('[db-deploy] fresh database — seeding PLATFORM + ACME tenants.');

    const userRepo = ds.getRepository(User);
    const memberRepo = ds.getRepository(TenantMember);
    const domainRepo = ds.getRepository(TenantDomain);

    // ── Tenants ──────────────────────────────────────────────────────────────
    const platform = await tenantRepo.save(tenantRepo.create({
      tenantId: ROOT_TENANT_ID,
      name: ROOT_TENANT_NAME,
      description: 'Root tenant — owns platform configuration and super-admin surface',
      tenantStatus: 'ACTIVE',
    }));
    const acme = await tenantRepo.save(tenantRepo.create({
      tenantId: ACME_TENANT_ID,
      name: ACME_TENANT_NAME,
      description: 'Example tenant created by the bootstrap seed',
      tenantStatus: 'ACTIVE',
    }));

    // ── Users ────────────────────────────────────────────────────────────────
    const makeUser = async (creds: { email: string; password: string }, userRole: 'ADMIN' | 'USER') =>
      userRepo.save(userRepo.create({
        email: creds.email,
        password: await bcrypt.hash(creds.password, 10),
        userRole,
        userStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
      }));
    const sysadmin = await makeUser(SEED_USERS.sysadmin, 'ADMIN');
    const acmeAdmin = await makeUser(SEED_USERS.acmeAdmin, 'USER');
    const acmeUser = await makeUser(SEED_USERS.acmeUser, 'USER');

    // ── Memberships ────────────────────────────────────────────────────────────
    const addMember = (tenantId: string, userId: string, memberRole: 'ADMIN' | 'OWNER' | 'USER') =>
      memberRepo.save(memberRepo.create({ tenantId, userId, memberRole, memberStatus: 'ACTIVE' }));
    await addMember(platform.tenantId, sysadmin.userId, 'ADMIN');
    await addMember(acme.tenantId, acmeAdmin.userId, 'OWNER');
    await addMember(acme.tenantId, acmeUser.userId, 'USER');

    // ── Primary domains (only when a wildcard domain is configured) ────────────
    const wildcard = process.env.TENANT_WILDCARD_DOMAIN;
    if (wildcard) {
      const rootSub = process.env.TENANT_DEFAULT_SUBDOMAIN || 'system';
      await domainRepo.save(domainRepo.create({
        tenantId: platform.tenantId, domain: `${rootSub}.${wildcard}`, isPrimary: true, domainStatus: 'ACTIVE',
      }));
      await domainRepo.save(domainRepo.create({
        tenantId: acme.tenantId, domain: `acme.${wildcard}`, isPrimary: true, domainStatus: 'ACTIVE',
      }));
    }

    // ── Bootstrap setting: don't force MFA on the root super-admin's first login ─
    const settingRepo = ds.getRepository(Setting);
    await settingRepo.save(settingRepo.create({
      tenantId: ROOT_TENANT_ID, key: 'adminRequireMfa', value: 'false', group: 'auth', type: 'boolean',
    }));

    console.log('[db-deploy] seeded:');
    console.log(`  PLATFORM (${platform.tenantId})  ADMIN  ${SEED_USERS.sysadmin.email} / ${SEED_USERS.sysadmin.password}`);
    console.log(`  ACME     (${acme.tenantId})  OWNER  ${SEED_USERS.acmeAdmin.email} / ${SEED_USERS.acmeAdmin.password}`);
    console.log(`  ACME     (${acme.tenantId})  USER   ${SEED_USERS.acmeUser.email} / ${SEED_USERS.acmeUser.password}`);
  } finally {
    await ds.destroy();
  }
}

/**
 * Idempotent deploy: sync schema → apply SQL migrations → seed-if-fresh. Safe
 * to re-run; this is what `scripts/db-deploy.ts` runs on every deploy.
 */
export async function deployDatabase(target: { url: string; schema?: string }): Promise<void> {
  await syncSchema(target);
  await applySqlMigrations(target);
  await seedIfFresh(target);
  console.log('[db-deploy] done.');
}

/**
 * Destructive demo reset: drop the schema, then run the full deploy so the
 * database returns to a clean seeded demo state. Callers MUST gate this behind
 * DEMO_MODE — it permanently destroys all data.
 */
export async function resetAndRedeploy(target: { url: string; schema?: string }): Promise<void> {
  await dropSchema(target);
  await deployDatabase(target);
}
