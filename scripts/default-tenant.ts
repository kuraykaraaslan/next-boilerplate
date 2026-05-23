import 'reflect-metadata';
import 'dotenv/config';
import { env } from '@/modules/env';
import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import { ROOT_TENANT_ID, ROOT_TENANT_NAME } from '@/modules/tenant/tenant.constants';
import { User } from '../modules/user/entities/user.entity';
import { Tenant } from '../modules/tenant/entities/tenant.entity';
import { TenantMember } from '../modules/tenant_member/entities/tenant_member.entity';
import { TenantDomain } from '../modules/tenant_domain/entities/tenant_domain.entity';

const systemDs = new DataSource({
  type: 'postgres',
  url: env.SYSTEM_DATABASE_URL,
  synchronize: false,
  entities: [User],
});

const tenantDs = new DataSource({
  type: 'postgres',
  url: env.TENANT_DATABASE_URL,
  synchronize: false,
  entities: [Tenant, TenantMember, TenantDomain],
});

async function upsertTenant(tenantId: string, name: string, description: string): Promise<Tenant> {
  const repo = tenantDs.getRepository(Tenant);
  const existing = await repo.findOne({ where: { tenantId } });
  if (existing) {
    console.log(`Using existing tenant [${tenantId}]: ${existing.name}`);
    return existing;
  }
  const created = await repo.save(
    repo.create({ tenantId, name, description, tenantStatus: 'ACTIVE' })
  );
  console.log(`Created tenant [${tenantId}]: ${created.name}`);
  return created;
}

async function upsertMembership(tenantId: string, userId: string, role: 'ADMIN' | 'OWNER' = 'ADMIN'): Promise<void> {
  const repo = tenantDs.getRepository(TenantMember);
  const existing = await repo.findOne({ where: { tenantId, userId } });
  if (existing) {
    if (existing.memberRole !== role || existing.memberStatus !== 'ACTIVE') {
      await repo.update({ tenantId, userId }, { memberRole: role, memberStatus: 'ACTIVE' });
    }
    return;
  }
  await repo.save(repo.create({ tenantId, userId, memberRole: role, memberStatus: 'ACTIVE' }));
}

async function upsertDomain(tenantId: string, domain: string, isPrimary: boolean): Promise<void> {
  const repo = tenantDs.getRepository(TenantDomain);
  const existing = await repo.findOne({ where: { domain } });
  if (existing) {
    if (existing.tenantId !== tenantId) {
      console.warn(`Domain ${domain} already mapped to a different tenant; leaving as-is`);
    }
    return;
  }
  await repo.save(
    repo.create({ tenantId, domain, isPrimary, domainStatus: 'ACTIVE' })
  );
  console.log(`Created tenant domain: ${domain} → ${tenantId}`);
}

async function main() {
  await systemDs.initialize();
  await tenantDs.initialize();

  const email = 'eneskuray@gmail.com';
  const password = 'qwerty20';
  const hashed = await bcrypt.hash(password, 10);

  // 1. Root tenant (platform-level config owner; super-admin scope)
  const rootTenant = await upsertTenant(
    ROOT_TENANT_ID,
    ROOT_TENANT_NAME,
    'Root tenant — owns platform configuration and super-admin surface',
  );

  // 2. Demo tenant (example customer workspace)
  const demoTenant = await upsertTenant(
    // Deterministic but distinct from root for repeatable local setup
    '00000000-0000-4000-8000-000000000001',
    'Acme Corp',
    'Example tenant created by setup script',
  );

  // 3. Bootstrap admin user (global record; lives in system schema)
  const userRepo = systemDs.getRepository(User);
  let user = await userRepo.findOne({ where: { email } });
  if (user) {
    await userRepo.update({ email }, { password: hashed } as any);
    user = (await userRepo.findOne({ where: { email } }))!;
  } else {
    user = await userRepo.save(
      userRepo.create({ email, password: hashed, userRole: 'USER', userStatus: 'ACTIVE' })
    );
  }
  console.log(`User processed: ${user.email} (${user.userId})`);

  // 4. Memberships — root grants super-admin; demo gives a tenant-scoped admin
  await upsertMembership(rootTenant.tenantId, user.userId, 'ADMIN');
  await upsertMembership(demoTenant.tenantId, user.userId, 'OWNER');

  // 5. Domains — bind the platform subdomain to root, the demo subdomain to demo
  const wildcard = env.TENANT_WILDCARD_DOMAIN;
  const rootSubdomain = process.env.TENANT_DEFAULT_SUBDOMAIN || 'system';
  await upsertDomain(rootTenant.tenantId, `${rootSubdomain}.${wildcard}`, true);
  await upsertDomain(demoTenant.tenantId, `acme.${wildcard}`, true);

  console.log('---');
  console.log('Root tenant ID :', rootTenant.tenantId);
  console.log('Demo tenant ID :', demoTenant.tenantId);
  console.log('User ID        :', user.userId);
  console.log('Login email    :', email);
  console.log('Login password :', password);
}

main()
  .catch((e) => {
    console.error('Error seeding initial data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await systemDs.destroy();
    await tenantDs.destroy();
  });
