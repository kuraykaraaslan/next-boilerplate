import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@/modules/seed/seed.context';
import { User } from './entities/user.entity';

/**
 * Demo seed for the `user` module.
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where`. The `User` entity's only @Unique constraint is `email`, so that
 *    is the idempotency key — re-runs reuse the existing row.
 *  - The `User` entity has NO `tenantId` column, so it is system-scoped:
 *    we use `ctx.systemRepo<User>(User)` and never set a tenantId.
 *  - Use *valid* enum values only (see `user.enums.ts`):
 *      userRole   ∈ { USER, ADMIN }
 *      userStatus ∈ { ACTIVE, INACTIVE, SUSPENDED }
 *  - Emails are stored lower-cased (the service normalises with toLowerCase);
 *    we seed them lower-cased so cache keys and lookups line up.
 *  - `password` is a real bcrypt hash literal (10 rounds) — every seeded user
 *    can log in with the passphrase "password". We avoid hashing at seed time
 *    to keep this file dependency-free.
 *  - Timestamp columns get real `Date` objects (this runs under tsx/Node).
 *  - We pin the canonical demo user / admin to the shared deterministic ids so
 *    cross-module references (orders, reviews, …) stay stable across re-runs.
 */

// bcrypt hash of the string "password" at cost factor 10 — valid & verifiable.
const DEMO_PASSWORD_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

type UserDef = {
  userId: string;
  email: string;
  phone?: string;
  userRole: 'USER' | 'ADMIN';
  userStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  /** days before "now" the account was created */
  createdDaysAgo: number;
  /** whether the email has been verified (and, if so, roughly when) */
  verified: boolean;
};

export async function seedUser(ctx: SeedContext): Promise<void> {
  const { foc, refs } = ctx;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const userRepo = ctx.systemRepo<User>(User);

  // Three varied accounts: a verified standard member, a verified admin, and a
  // suspended/unverified account — exercising every role + status value.
  const userDefs: UserDef[] = [
    {
      userId: SEED_USER_ID,
      email: 'demo.user@example.com',
      phone: '+1-202-555-0101',
      userRole: 'USER',
      userStatus: 'ACTIVE',
      createdDaysAgo: 30,
      verified: true,
    },
    {
      userId: SEED_ADMIN_USER_ID,
      email: 'demo.admin@example.com',
      phone: '+44-20-7946-0991',
      userRole: 'ADMIN',
      userStatus: 'ACTIVE',
      createdDaysAgo: 90,
      verified: true,
    },
    {
      userId: 'a0000000-0000-4000-8000-000000000003',
      email: 'demo.suspended@example.com',
      userRole: 'USER',
      userStatus: 'SUSPENDED',
      createdDaysAgo: 7,
      verified: false,
    },
  ];

  for (const def of userDefs) {
    const createdAt = new Date(now - def.createdDaysAgo * day);
    await foc(userRepo,
      { email: def.email } as FindOptionsWhere<User>,
      {
        userId: def.userId,
        email: def.email,
        phone: def.phone,
        password: DEMO_PASSWORD_HASH,
        userRole: def.userRole,
        userStatus: def.userStatus,
        // verify shortly after creation; leave unverified accounts null.
        emailVerifiedAt: def.verified ? new Date(createdAt.getTime() + day) : undefined,
        createdAt,
        updatedAt: createdAt,
      },
    );
  }

  // ── Publish references later modules consume ───────────────────────────────
  refs.userId = SEED_USER_ID;
  refs.adminUserId = SEED_ADMIN_USER_ID;

  ctx.log('user: 3 users (USER/ADMIN, ACTIVE/SUSPENDED) seeded (system-scoped)');
}
