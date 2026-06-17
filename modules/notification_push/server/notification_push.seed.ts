import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@kuraykaraaslan/seed/server/seed.context';
import { PushSubscription } from './entities/push_subscription.entity';

/**
 * notification_push seed.
 *
 * The module owns a single tenant-scoped entity, PushSubscription — a Web Push
 * (VAPID) endpoint plus its `p256dh`/`auth` keys for one user on one device.
 *
 * Rules of the house (mirrors store.seed.ts):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where`. The entity's @Unique constraint is (tenantId, endpoint) — so the
 *    endpoint URL is the natural key and re-runs reuse rows.
 *  - PushSubscription HAS a `tenantId` column, so it is tenant-scoped: use
 *    `ctx.repo<PushSubscription>(PushSubscription)` and set `tenantId`.
 *  - `userId` is a cross-module reference (a bare uuid; no cross-db FK). Prefer
 *    the shared `SEED_USER_ID` / `SEED_ADMIN_USER_ID` constants, or `ctx.refs`.
 *  - Cover the real feature surface with varied rows: two distinct users, and
 *    the same user subscribed on two different devices/browsers (the module
 *    explicitly supports multiple endpoints per user — see sendToUser fan-out).
 */
export async function seedNotificationPush(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module user ids: read from refs if a prior seed published them,
  // otherwise fall back to the deterministic shared constants.
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;

  const repo = ctx.repo<PushSubscription>(PushSubscription);

  // Realistic-looking but fake push endpoints + base64url-ish key material.
  // Each browser/device combination is a separate subscription row.
  type SubDef = {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    createdAt: Date;
  };

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  const subDefs: SubDef[] = [
    // Regular user, Chrome on desktop (FCM endpoint).
    {
      userId,
      endpoint:
        'https://fcm.googleapis.com/fcm/send/seed-chrome-desktop:APA91bSeedChromeDesktopEndpointTokenAAA',
      p256dh:
        'BNcRdSeedChromeDesktopP256dhKeyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      auth: 'c2VlZENocm9tZURlc2t0b3BBdXRo',
      createdAt: daysAgo(7),
    },
    // Same regular user, Firefox on mobile (Mozilla autopush endpoint) — proves
    // the multi-device fan-out path.
    {
      userId,
      endpoint:
        'https://updates.push.services.mozilla.com/wpush/v2/seed-firefox-mobile-endpoint-token-BBB',
      p256dh:
        'BLfSeedFirefoxMobileP256dhKeyBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      auth: 'c2VlZEZpcmVmb3hNb2JpbGVBdXRo',
      createdAt: daysAgo(3),
    },
    // Admin user, Edge on desktop (Windows WNS endpoint).
    {
      userId: adminUserId,
      endpoint:
        'https://wns2-by3p.notify.windows.com/w/?token=seed-edge-admin-endpoint-token-CCC',
      p256dh:
        'BPqSeedEdgeAdminP256dhKeyCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      auth: 'c2VlZEVkZ2VBZG1pbkF1dGg',
      createdAt: daysAgo(1),
    },
  ];

  let firstId: string | undefined;
  for (const def of subDefs) {
    const sub = await foc(
      repo,
      { tenantId, endpoint: def.endpoint } as FindOptionsWhere<PushSubscription>,
      {
        tenantId,
        userId: def.userId,
        endpoint: def.endpoint,
        p256dh: def.p256dh,
        auth: def.auth,
        createdAt: def.createdAt,
      },
    );
    firstId ??= sub.id;
  }

  // Publish a reference later modules might consume.
  refs.pushSubscriptionId = firstId;

  ctx.log(`notification_push: ${subDefs.length} push subscriptions (2 users, 3 devices) for ${tenantId}`);
}
