import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find the first tenant
  const tenant = await prisma.tenant.findFirst();

  if (!tenant) {
    console.error('Tenant bulunamadı. Lütfen önce scripts/create-tenant.ts ile bir tenant oluşturun.');
    return;
  }

  const defaultDomain = `acme.${process.env.TENANT_WILDCARD_DOMAIN}`;
  const domainName = process.argv[2] || defaultDomain;

  const tenantDomain = await prisma.tenantDomain.create({
    data: {
      tenantId: tenant.tenantId,
      domain: domainName,
      isPrimary: true,
      domainStatus: 'ACTIVE',
    },
  });

  console.log('Created tenant domain:', JSON.stringify(tenantDomain, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
