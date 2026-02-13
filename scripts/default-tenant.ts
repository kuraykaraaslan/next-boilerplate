import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TenantMemberRole } from '../prisma/client';
import bcrypt from "bcrypt";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'eneskuray@gmail.com';
  const password = 'qwerty20';

  // 1. Get or Create the first tenant
  let tenant = await prisma.tenant.findFirst();
  
  if (!tenant) {
    tenant = await prisma.tenant.create({
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
  const user = await prisma.user.upsert({
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
  const member = await prisma.tenantMember.upsert({
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
  const tenantDomain = await prisma.tenantDomain.create({
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
    await prisma.$disconnect();
  });
