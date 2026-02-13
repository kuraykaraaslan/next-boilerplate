import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/client';
import brcypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
    const adminEmail = 'admin@kuray.dev';
    const adminPassword = 'demo123456';


    // Create admin user
    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            userRole: 'ADMIN',
            password: await brcypt.hash(adminPassword, 10),
        },
        create: {
            email: adminEmail,
            password: await brcypt.hash(adminPassword, 10),
            userRole: 'ADMIN',
        },
    });
    console.log('Created admin user:', adminUser.email);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());