import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Acme Corporation',
      description: 'Default tenant for testing purposes',
      tenantStatus: 'ACTIVE',
    }
  });
  console.log('Created tenant:', JSON.stringify(tenant, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
