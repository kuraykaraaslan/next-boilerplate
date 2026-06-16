import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@nb/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@nb/seed/server/seed.context';
import { UserSocialAccount } from './entities/user_social_account.entity';

/**
 * Seeds federated identities linked to demo users. A `UserSocialAccount` is the
 * stored result of an OAuth SSO (or SAML) login: it ties a `userId` to an
 * external `(provider, providerId)` pair plus the tokens minted at link time.
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - `UserSocialAccount` has NO `tenantId` column → it is system-scoped, so we
 *    go through `ctx.systemRepo(...)` and never set a tenantId.
 *  - Natural key for idempotency is the `@Unique(['provider', 'providerId'])`
 *    composite, so re-runs reuse rows.
 *  - `provider` must be a valid `SocialAccountProviderEnum` value: the OAuth SSO
 *    set (google/apple/facebook/github/linkedin/microsoft/twitter/slack/tiktok/
 *    wechat/autodesk) plus 'saml'. Wrong values crash reads via the zod schema.
 *  - The seeded user/admin ids come from the shared `SEED_*` constants so other
 *    seeds and the identity module agree on who these links belong to.
 */
export async function seedUserSocialAccount(ctx: SeedContext): Promise<void> {
  const userId = (ctx.refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (ctx.refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  // ── Linked social accounts (varied providers / token shapes / users) ────────
  type AccountDef = {
    userId: string;
    provider: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
    profilePicture?: string;
    createdAt: Date;
  };

  const accounts: AccountDef[] = [
    // Google OAuth: full token pair + avatar, linked to the demo user a while ago.
    {
      userId,
      provider: 'google',
      providerId: '110000000000000000001',
      accessToken: 'ya29.seed-google-access-token',
      refreshToken: '1//seed-google-refresh-token',
      profilePicture: 'https://lh3.googleusercontent.com/a/seed-google-avatar',
      createdAt: daysAgo(30),
    },
    // GitHub OAuth: access token, no refresh token (GitHub OAuth apps omit it),
    // recently linked.
    {
      userId,
      provider: 'github',
      providerId: '9000001',
      accessToken: 'gho_seedGithubAccessToken000000000000000',
      profilePicture: 'https://avatars.githubusercontent.com/u/9000001?v=4',
      createdAt: daysAgo(5),
    },
    // SAML federated identity for the admin: no OAuth tokens, just the NameID as
    // providerId — exercises the non-OAuth branch of the provider enum.
    {
      userId: adminUserId,
      provider: 'saml',
      providerId: 'admin@acme-idp.example.com',
      createdAt: daysAgo(60),
    },
  ];

  const repo = ctx.systemRepo<UserSocialAccount>(UserSocialAccount);
  let firstAccountId: string | undefined;
  for (const def of accounts) {
    const row = await ctx.foc<UserSocialAccount>(
      repo,
      { provider: def.provider, providerId: def.providerId } as FindOptionsWhere<UserSocialAccount>,
      def,
    );
    firstAccountId ??= row.userSocialAccountId;
  }

  // ── Publish references later modules might consume ──────────────────────────
  ctx.refs.userSocialAccountId = firstAccountId;

  ctx.log(`user_social_account: ${accounts.length} linked accounts (google, github, saml)`);
}
