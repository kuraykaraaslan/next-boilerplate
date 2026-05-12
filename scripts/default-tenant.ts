import 'reflect-metadata';
import 'dotenv/config';
import { env } from '@/modules/env';
import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
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

async function main() {
  await systemDs.initialize();
  await tenantDs.initialize();

  const email = 'eneskuray@gmail.com';
  const password = 'qwerty20';

  let tenant = await tenantDs.getRepository(Tenant).findOne({ where: {} });

  if (!tenant) {
    tenant = await tenantDs.getRepository(Tenant).save(
      tenantDs.getRepository(Tenant).create({
        name: 'Default Tenant',
        description: 'First tenant created by setup script',
        tenantStatus: 'ACTIVE',
      })
    );
    console.log('Created first tenant:', tenant.name);
  } else {
    console.log('Using existing tenant:', tenant.name);
  }

  const hashed = await bcrypt.hash(password, 10);

  const existing = await systemDs.getRepository(User).findOne({ where: { email } });
  let user: User;
  if (existing) {
    await systemDs.getRepository(User).update({ email }, { password: hashed } as any);
    user = (await systemDs.getRepository(User).findOne({ where: { email } }))!;
  } else {
    user = await systemDs.getRepository(User).save(
      systemDs.getRepository(User).create({ email, password: hashed, userRole: 'USER', userStatus: 'ACTIVE' })
    );
  }

  console.log('User processed:', user.email);

  const existingMember = await tenantDs.getRepository(TenantMember).findOne({
    where: { tenantId: tenant.tenantId, userId: user.userId },
  });

  if (existingMember) {
    await tenantDs.getRepository(TenantMember).update(
      { tenantId: tenant.tenantId, userId: user.userId },
      { memberRole: 'ADMIN', memberStatus: 'ACTIVE' }
    );
  } else {
    await tenantDs.getRepository(TenantMember).save(
      tenantDs.getRepository(TenantMember).create({
        tenantId: tenant.tenantId,
        userId: user.userId,
        memberRole: 'ADMIN',
        memberStatus: 'ACTIVE',
      })
    );
  }

  console.log('User associated with tenant as ADMIN');
  console.log('---');
  console.log('Tenant ID:', tenant.tenantId);
  console.log('User ID:', user.userId);
  console.log('Login Email:', email);
  console.log('Login Password:', password);

  const defaultDomain = `acme.${env.TENANT_WILDCARD_DOMAIN}`;
  const tenantDomain = await tenantDs.getRepository(TenantDomain).save(
    tenantDs.getRepository(TenantDomain).create({
      tenantId: tenant.tenantId,
      domain: defaultDomain,
      isPrimary: true,
      domainStatus: 'ACTIVE',
    })
  );
  console.log('Created tenant domain:', tenantDomain.domain);
}

main()
  .catch((e) => {
    console.error('Error seeding initial user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await systemDs.destroy();
    await tenantDs.destroy();
  });
