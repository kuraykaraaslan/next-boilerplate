import 'reflect-metadata';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getDataSource } from '@/modules/db';
import { ROOT_TENANT_ID, ROOT_TENANT_NAME } from '@/modules/tenant/tenant.constants';
import { User } from '@/modules/user/entities/user.entity';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import { Setting } from '@/modules/setting/entities/setting.entity';

async function main() {
  const ds = await getDataSource();

  const adminEmail = 'admin@kuray.dev';
  const adminPassword = 'demo123456';
  const hashed = await bcrypt.hash(adminPassword, 10);

  const userRepo = ds.getRepository(User);
  let user = await userRepo.findOne({ where: { email: adminEmail } });
  if (user) {
    await userRepo.update(
      { email: adminEmail },
      {
        userRole: 'ADMIN',
        userStatus: 'ACTIVE',
        password: hashed,
        // Bootstrap admin must always be email-verified, otherwise login is
        // blocked when the tenant's emailVerificationRequired policy is on.
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      } as any,
    );
    user = (await userRepo.findOne({ where: { email: adminEmail } }))!;
    console.log('Updated admin user:', adminEmail);
  } else {
    user = await userRepo.save(
      userRepo.create({
        email: adminEmail,
        password: hashed,
        userRole: 'ADMIN',
        userStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
      }),
    );
    console.log('Created admin user:', adminEmail);
  }

  const tenantRepo = ds.getRepository(Tenant);
  const rootExists = await tenantRepo.findOne({ where: { tenantId: ROOT_TENANT_ID } });
  if (!rootExists) {
    await tenantRepo.save(
      tenantRepo.create({
        tenantId: ROOT_TENANT_ID,
        name: ROOT_TENANT_NAME,
        description: 'Root tenant — owns platform configuration and super-admin surface',
        tenantStatus: 'ACTIVE',
      }),
    );
    console.log('Created root tenant:', ROOT_TENANT_ID);
  }

  const memberRepo = ds.getRepository(TenantMember);
  const existingMember = await memberRepo.findOne({
    where: { tenantId: ROOT_TENANT_ID, userId: user.userId },
  });
  if (existingMember) {
    if (existingMember.memberRole !== 'ADMIN' || existingMember.memberStatus !== 'ACTIVE') {
      await memberRepo.update(
        { tenantId: ROOT_TENANT_ID, userId: user.userId },
        { memberRole: 'ADMIN', memberStatus: 'ACTIVE' },
      );
      console.log('Promoted admin to root tenant super-admin');
    } else {
      console.log('Admin already a root tenant super-admin');
    }
  } else {
    await memberRepo.save(
      memberRepo.create({
        tenantId: ROOT_TENANT_ID,
        userId: user.userId,
        memberRole: 'ADMIN',
        memberStatus: 'ACTIVE',
      }),
    );
    console.log('Added admin as root tenant super-admin');
  }

  const settingRepo = ds.getRepository(Setting);
  const mfaSetting = await settingRepo.findOne({
    where: { tenantId: ROOT_TENANT_ID, key: 'adminRequireMfa' },
  });
  if (mfaSetting) {
    if (mfaSetting.value !== 'false') {
      await settingRepo.update(
        { tenantId: ROOT_TENANT_ID, key: 'adminRequireMfa' },
        { value: 'false' },
      );
      console.log('Disabled adminRequireMfa for root tenant (bootstrap)');
    }
  } else {
    await settingRepo.save(
      settingRepo.create({
        tenantId: ROOT_TENANT_ID,
        key: 'adminRequireMfa',
        value: 'false',
        group: 'auth',
        type: 'boolean',
      }),
    );
    console.log('Seeded adminRequireMfa=false for root tenant (bootstrap)');
  }

  console.log('---');
  console.log('Login email    :', adminEmail);
  console.log('Login password :', adminPassword);
  console.log('User ID        :', user.userId);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
