/**
 * One-shot data migration: convert the legacy "system" pseudo-tenant into a
 * real tenant row with ROOT_TENANT_ID and promote existing global admins to
 * root-tenant ADMIN members.
 *
 * Safe to re-run — every write is upsert / idempotent. Run on dev/staging
 * before prod, with a recent backup in hand.
 *
 *   npx tsx scripts/migrate-to-root-tenant.ts
 *
 * What it does:
 *   1. Upsert Tenant(ROOT_TENANT_ID, 'Platform', ACTIVE)
 *   2. Upsert TenantDomain({ROOT_SUBDOMAIN}.{WILDCARD}, isPrimary=true)
 *   3. For every User with userRole IN ('ADMIN', 'SUPER_ADMIN'), upsert
 *      TenantMember(ROOT_TENANT_ID, userId, 'ADMIN', 'ACTIVE')
 *
 * What it does NOT do:
 *   - Add tenantId columns to entities (we kept the "karma" schema design;
 *     User and related entities stay global).
 *   - Touch existing customer tenants or their data.
 *   - Migrate webhook rows. Platform webhooks now live in the same `Webhook`
 *     table as tenant webhooks, keyed by tenantId = ROOT_TENANT_ID. SAML
 *     config likewise lives in `SamlConfig` keyed by ROOT_TENANT_ID — no
 *     separate system table or migration step is needed.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { env } from '@/modules/env';
import { ROOT_TENANT_ID, ROOT_TENANT_NAME } from '@/modules/tenant/tenant.constants';
import { User } from '../modules/user/entities/user.entity';
import { Tenant } from '../modules/tenant/entities/tenant.entity';
import { TenantMember } from '../modules/tenant_member/entities/tenant_member.entity';
import { TenantDomain } from '../modules/tenant_domain/entities/tenant_domain.entity';

function parseDbUrl(raw: string): { url: string; schema?: string } {
  const match = raw.match(/[?&]schema=([^&]+)/);
  const schema = match?.[1];
  const url = raw.replace(/[?&]schema=[^&]+/, '').replace(/[?&]$/, '');
  return { url, schema };
}

const systemDb = parseDbUrl(env.SYSTEM_DATABASE_URL);
const tenantDb = parseDbUrl(env.TENANT_DATABASE_URL);

const systemDs = new DataSource({
  type: 'postgres',
  url: systemDb.url,
  schema: systemDb.schema,
  synchronize: false,
  logging: false,
  entities: [User],
});

const tenantDs = new DataSource({
  type: 'postgres',
  url: tenantDb.url,
  schema: tenantDb.schema,
  synchronize: false,
  logging: false,
  entities: [Tenant, TenantMember, TenantDomain],
});

async function ensureRootTenant(): Promise<Tenant> {
  const repo = tenantDs.getRepository(Tenant);
  let row = await repo.findOne({ where: { tenantId: ROOT_TENANT_ID } });
  if (row) {
    console.log(`✓ root tenant already exists: ${row.tenantId}`);
    return row;
  }
  row = await repo.save(repo.create({
    tenantId: ROOT_TENANT_ID,
    name: ROOT_TENANT_NAME,
    description: 'Platform tenant — owns super-admin scope and platform-level configuration',
    tenantStatus: 'ACTIVE',
  }));
  console.log(`+ created root tenant ${row.tenantId}`);
  return row;
}

async function ensureRootDomain(): Promise<void> {
  const wildcard = env.TENANT_WILDCARD_DOMAIN;
  const subdomain = process.env.TENANT_DEFAULT_SUBDOMAIN || 'system';
  const domain = `${subdomain}.${wildcard}`;
  const repo = tenantDs.getRepository(TenantDomain);
  const existing = await repo.findOne({ where: { domain } });
  if (existing) {
    if (existing.tenantId !== ROOT_TENANT_ID) {
      console.warn(`! domain ${domain} maps to ${existing.tenantId}, not ROOT_TENANT_ID — leaving as-is`);
    } else {
      console.log(`✓ root domain already mapped: ${domain}`);
    }
    return;
  }
  await repo.save(repo.create({
    tenantId: ROOT_TENANT_ID,
    domain,
    isPrimary: true,
    domainStatus: 'ACTIVE',
  }));
  console.log(`+ mapped root domain: ${domain}`);
}

async function promoteAdmins(): Promise<{ promoted: number; skipped: number }> {
  const userRepo = systemDs.getRepository(User);
  const memberRepo = tenantDs.getRepository(TenantMember);
  const admins = await userRepo.find({
    where: [
      { userRole: 'ADMIN' },
      { userRole: 'SUPER_ADMIN' },
    ],
  });
  let promoted = 0;
  let skipped = 0;
  for (const user of admins) {
    const existing = await memberRepo.findOne({
      where: { tenantId: ROOT_TENANT_ID, userId: user.userId },
    });
    if (existing) {
      if (existing.memberRole !== 'ADMIN' || existing.memberStatus !== 'ACTIVE') {
        await memberRepo.update(
          { tenantId: ROOT_TENANT_ID, userId: user.userId },
          { memberRole: 'ADMIN', memberStatus: 'ACTIVE' },
        );
        promoted += 1;
        console.log(`~ upgraded ${user.email} → root tenant ADMIN`);
      } else {
        skipped += 1;
      }
      continue;
    }
    await memberRepo.save(memberRepo.create({
      tenantId: ROOT_TENANT_ID,
      userId: user.userId,
      memberRole: 'ADMIN',
      memberStatus: 'ACTIVE',
    }));
    promoted += 1;
    console.log(`+ promoted ${user.email} → root tenant ADMIN`);
  }
  return { promoted, skipped };
}

async function main() {
  console.log('migrate-to-root-tenant: starting…');
  console.log(`ROOT_TENANT_ID = ${ROOT_TENANT_ID}`);
  console.log('');

  await systemDs.initialize();
  await tenantDs.initialize();

  await ensureRootTenant();
  await ensureRootDomain();
  const { promoted, skipped } = await promoteAdmins();

  console.log('');
  console.log('---');
  console.log(`promoted admins : ${promoted}`);
  console.log(`already-correct : ${skipped}`);
  console.log('migrate-to-root-tenant: done.');
}

main()
  .catch((err) => {
    console.error('migrate-to-root-tenant: failed', err);
    process.exit(1);
  })
  .finally(async () => {
    if (systemDs.isInitialized) await systemDs.destroy();
    if (tenantDs.isInitialized) await tenantDs.destroy();
  });
