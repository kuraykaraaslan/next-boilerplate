import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@kuraykaraaslan/seed/server/seed.context';
import { UserPreferences } from './entities/user_preferences.entity';
import type { Language } from './user_preferences.enums';

/**
 * Demo data for the `user_preferences` module.
 *
 * Rules of the house (see `store.seed.ts` for the reference template):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows. Here the natural key is the @Column({ unique })
 *    `userId` — one preferences row per user.
 *  - Use *valid* enum values only (from `user_preferences.enums.ts`):
 *      theme          → LIGHT | DARK | SYSTEM
 *      language       → EN | ES | FR | DE | CN | JP
 *      dateFormat     → DD_MM_YYYY | MM_DD_YYYY
 *      timeFormat     → H24 | H12
 *      firstDayOfWeek → MON | SUN
 *  - The entity has NO `tenantId` column, so it is system-scoped: use
 *    `ctx.systemRepo(Entity)` and never set tenantId.
 *  - Cover the feature set with varied rows (themes, locales, notification flags).
 */
export async function seedUserPreferences(ctx: SeedContext): Promise<void> {
  const { foc, refs } = ctx;

  const seedUserId = (refs.userId as string) ?? SEED_USER_ID;
  const seedAdminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;
  // A third, "guest" demo user that no other module owns — fixed uuid literal.
  const guestUserId = 'a0000000-0000-4000-8000-000000000003';

  // Concrete local spec type so foc's create argument keeps full inference
  // (never spread a Partial<Entity> into foc — it breaks type checking).
  type PrefDef = {
    userId: string;
    theme: 'LIGHT' | 'DARK' | 'SYSTEM';
    language: Language;
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    newsletter: boolean;
    timezone: string;
    dateFormat: 'DD_MM_YYYY' | 'MM_DD_YYYY';
    timeFormat: 'H24' | 'H12';
    firstDayOfWeek: 'MON' | 'SUN';
  };

  const prefDefs: PrefDef[] = [
    // Power user: dark theme, US locale, everything on, 12h clock.
    {
      userId: seedUserId,
      theme: 'DARK',
      language: 'en',
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      newsletter: true,
      timezone: 'America/New_York',
      dateFormat: 'MM_DD_YYYY',
      timeFormat: 'H12',
      firstDayOfWeek: 'SUN',
    },
    // Admin: light theme, German locale, transactional-only notifications.
    {
      userId: seedAdminUserId,
      theme: 'LIGHT',
      language: 'de',
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: false,
      newsletter: false,
      timezone: 'Europe/Berlin',
      dateFormat: 'DD_MM_YYYY',
      timeFormat: 'H24',
      firstDayOfWeek: 'MON',
    },
    // Guest: follows the system theme, Japanese locale, push-only, no marketing.
    {
      userId: guestUserId,
      theme: 'SYSTEM',
      language: 'ja',
      emailNotifications: false,
      smsNotifications: false,
      pushNotifications: true,
      newsletter: false,
      timezone: 'Asia/Tokyo',
      dateFormat: 'DD_MM_YYYY',
      timeFormat: 'H24',
      firstDayOfWeek: 'MON',
    },
  ];

  const repo = ctx.systemRepo<UserPreferences>(UserPreferences);
  // A history timestamp so the demo rows look like they were created earlier.
  const createdAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  for (const def of prefDefs) {
    await foc(
      repo,
      { userId: def.userId } as FindOptionsWhere<UserPreferences>,
      { ...def, createdAt },
    );
  }

  ctx.log(`user_preferences: ${prefDefs.length} preference rows (system-scoped)`);
}
