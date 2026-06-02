import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@/modules/seed/seed.context';
import { UserProfile } from './entities/user_profile.entity';

/**
 * Demo seed for the `user_profile` module.
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` (here the @Unique `userId`) so re-runs reuse rows.
 *  - Use *valid* enum values: `socialLinks[].platform` must be one of the
 *    `SocialLinkPlatformEnum` members (GITHUB / LINKEDIN / TWITTER / …).
 *  - Cover the entity with 2–3 *varied* rows.
 *
 * Scoping: `UserProfile` has NO `tenantId` column (it is keyed solely on the
 * cross-module `userId`), so it is SYSTEM-scoped — use `ctx.systemRepo(...)`
 * and never set a `tenantId`. The `userId` values are bare cross-module uuids
 * (no cross-database FK), taken from the shared SEED_*_USER_ID constants plus a
 * deterministic literal for a third demo persona.
 */

// A social-link item as stored in the `socialLinks` jsonb array.
type SocialLink = { id: string; platform: string; url: string | null; order: number };

// A concrete local row shape so foc's `create` keeps strong inference (never
// spread a Partial<Entity> — see the type-safety note in the framework).
type ProfileDef = {
  userId: string;
  name: string;
  biography: string;
  profilePicture: string;
  headerImage: string;
  socialLinks: SocialLink[];
};

export async function seedUserProfile(ctx: SeedContext): Promise<void> {
  const { foc } = ctx;
  const profileRepo = ctx.systemRepo<UserProfile>(UserProfile);

  // Third persona has no shared constant — use a fixed uuid literal so re-runs
  // and cross-module references stay deterministic.
  const guestUserId = 'a0000000-0000-4000-8000-000000000003';

  const profiles: ProfileDef[] = [
    // Regular member — a busy developer persona with many social links.
    {
      userId: SEED_USER_ID,
      name: 'Test User',
      biography:
        'Full-stack engineer who loves TypeScript, Postgres and shipping small things often. This is a seeded demo profile.',
      profilePicture: 'https://i.pravatar.cc/300?img=12',
      headerImage: 'https://picsum.photos/seed/profile-user/1200/300',
      socialLinks: [
        { id: '11111111-0000-4000-8000-000000000001', platform: 'GITHUB', url: 'https://github.com/test-user', order: 0 },
        { id: '11111111-0000-4000-8000-000000000002', platform: 'LINKEDIN', url: 'https://www.linkedin.com/in/test-user', order: 1 },
        { id: '11111111-0000-4000-8000-000000000003', platform: 'TWITTER', url: 'https://twitter.com/test_user', order: 2 },
        { id: '11111111-0000-4000-8000-000000000004', platform: 'DEVTO', url: 'https://dev.to/test-user', order: 3 },
        { id: '11111111-0000-4000-8000-000000000005', platform: 'WEBSITE', url: 'https://test-user.example.com', order: 4 },
      ],
    },
    // Admin — fewer, professional links; one link with a null url (allowed).
    {
      userId: SEED_ADMIN_USER_ID,
      name: 'Test Admin',
      biography: 'Platform administrator and occasional writer. Seeded demo profile for the admin account.',
      profilePicture: 'https://i.pravatar.cc/300?img=5',
      headerImage: 'https://picsum.photos/seed/profile-admin/1200/300',
      socialLinks: [
        { id: '22222222-0000-4000-8000-000000000001', platform: 'GITLAB', url: 'https://gitlab.com/test-admin', order: 0 },
        { id: '22222222-0000-4000-8000-000000000002', platform: 'MEDIUM', url: 'https://medium.com/@test-admin', order: 1 },
        { id: '22222222-0000-4000-8000-000000000003', platform: 'EMAIL', url: null, order: 2 },
        { id: '22222222-0000-4000-8000-000000000004', platform: 'CALENDLY', url: 'https://calendly.com/test-admin/30min', order: 3 },
      ],
    },
    // Minimal guest persona — empty bio-ish, single community link, no header.
    {
      userId: guestUserId,
      name: 'Guest Designer',
      biography: 'Freelance UI designer. Mostly lurking — seeded minimal profile.',
      profilePicture: 'https://i.pravatar.cc/300?img=32',
      headerImage: '',
      socialLinks: [
        { id: '33333333-0000-4000-8000-000000000001', platform: 'DISCORD', url: 'https://discord.com/users/test-guest', order: 0 },
        { id: '33333333-0000-4000-8000-000000000002', platform: 'INSTAGRAM', url: 'https://instagram.com/test.guest', order: 1 },
      ],
    },
  ];

  let firstProfileId: string | undefined;
  for (const def of profiles) {
    const profile = await foc(profileRepo,
      { userId: def.userId } as FindOptionsWhere<UserProfile>,
      {
        userId: def.userId,
        name: def.name,
        biography: def.biography,
        profilePicture: def.profilePicture,
        headerImage: def.headerImage,
        socialLinks: def.socialLinks,
      },
    );
    firstProfileId ??= profile.userProfileId;
  }

  // Publish a reference later modules may consume.
  ctx.refs.userProfileId = firstProfileId;

  ctx.log(`user_profile: ${profiles.length} profiles (user/admin/guest) seeded`);
}
