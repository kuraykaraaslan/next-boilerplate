import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as SystemPrismaClient } from '../prisma/system/client';
import { PrismaClient as TenantPrismaClient, TenantMemberRole } from '../prisma/tenant/client';
import bcrypt from "bcrypt";

const systemAdapter = new PrismaPg({ connectionString: `${process.env.SYSTEM_DATABASE_URL}` });
const tenantAdapter = new PrismaPg({ connectionString: `${process.env.TENANT_DATABASE_URL}` });
const systemPrisma = new SystemPrismaClient({ adapter: systemAdapter });
const tenantPrisma = new TenantPrismaClient({ adapter: tenantAdapter });

async function main() {
  const email = 'eneskuray@gmail.com';
  const password = 'qwerty20';

  // 1. Get or Create the first tenant
  let tenant = await tenantPrisma.tenant.findFirst();

  if (!tenant) {
    tenant = await tenantPrisma.tenant.create({
      data: {
        name: 'Default Tenant',
        description: 'First tenant created by setup script',
        tenantStatus: 'ACTIVE',
      }
    });
    console.log('Created first tenant:', tenant.name);
  } else {
    console.log('Using existing tenant:', tenant.name);
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Create or update the user
  const user = await systemPrisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
    },
    create: {
      email,
      password: hashedPassword,
      userRole: 'USER',
      userStatus: 'ACTIVE',
    },
  });

  console.log('User processed:', user.email);

  // 4. Associate user with tenant if not already a member
  const member = await tenantPrisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.tenantId,
        userId: user.userId,
      },
    },
    update: {
      memberRole: TenantMemberRole.ADMIN,
      memberStatus: 'ACTIVE',
    },
    create: {
      tenantId: tenant.tenantId,
      userId: user.userId,
      memberRole: TenantMemberRole.ADMIN,
      memberStatus: 'ACTIVE',
    },
  });

  console.log('User associated with tenant as ADMIN');
  console.log('---');
  console.log('Tenant ID:', tenant.tenantId);
  console.log('User ID:', user.userId);
  console.log('Login Email:', email);
  console.log('Login Password:', password);

  // 5. Create a default domain for the tenant
  const defaultDomain = `acme.${process.env.TENANT_WILDCARD_DOMAIN}`;
  const tenantDomain = await tenantPrisma.tenantDomain.create({
    data: {
      tenantId: tenant.tenantId,
      domain: defaultDomain,
      isPrimary: true,
      domainStatus: 'ACTIVE',
    },
  });
  console.log('Created tenant domain:', tenantDomain.domain);
}

main()
  .catch(e => {
    console.error('Error seeding initial user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await systemPrisma.$disconnect();
    await tenantPrisma.$disconnect();
  });
