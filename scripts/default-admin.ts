import 'reflect-metadata';
import 'dotenv/config';
import { env } from '@/modules/env';
import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import { User } from '../modules/user/entities/user.entity';

const ds = new DataSource({
  type: 'postgres',
  url: env.SYSTEM_DATABASE_URL,
  synchronize: false,
  entities: [User],
});

async function main() {
  await ds.initialize();
  const repo = ds.getRepository(User);

  const adminEmail = 'admin@kuray.dev';
  const adminPassword = 'demo123456';
  const hashed = await bcrypt.hash(adminPassword, 10);

  const existing = await repo.findOne({ where: { email: adminEmail } });
  if (existing) {
    await repo.update({ email: adminEmail }, { userRole: 'ADMIN', password: hashed } as any);
    console.log('Updated admin user:', adminEmail);
  } else {
    await repo.save(repo.create({ email: adminEmail, password: hashed, userRole: 'ADMIN' }));
    console.log('Created admin user:', adminEmail);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => ds.destroy());
