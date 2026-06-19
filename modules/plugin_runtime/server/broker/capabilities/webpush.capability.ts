// webpush: HOST-SIDE Web Push (VAPID) delivery for sandboxed push provider plugins.
// A V8 isolate can't do the Web Push payload encryption (ECDH + HKDF + AES-GCM) nor
// hold the VAPID private key, so the isolate hands the subscription + payload here and
// the broker sends via the `web-push` library. The VAPID key pair is resolved
// HOST-SIDE (per-tenant settings, else platform env) and never enters the isolate.
import webpushLib from 'web-push';
import { env } from '@kuraykaraaslan/env';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import type { Json } from '../../../sdk/types';
import type { BrokerCtx } from '../broker.context';

interface PushSubscriptionInput { endpoint: string; p256dh: string; auth: string }

async function resolveVapid(tenantId: string): Promise<{ subject: string; publicKey: string; privateKey: string } | null> {
  const s = await SettingService.getByKeys(tenantId, ['vapidPublicKey', 'vapidPrivateKey', 'vapidContactEmail']).catch(() => ({} as Record<string, string>));
  if (s.vapidPublicKey && s.vapidPrivateKey) {
    return { subject: `mailto:${s.vapidContactEmail || env.VAPID_CONTACT_EMAIL || 'info@example.com'}`, publicKey: s.vapidPublicKey, privateKey: s.vapidPrivateKey };
  }
  if (env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return { subject: `mailto:${env.VAPID_CONTACT_EMAIL || 'info@example.com'}`, publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  }
  return null;
}

export const webpush = {
  async send(ctx: BrokerCtx, subscription: PushSubscriptionInput, payloadJson: string): Promise<Json> {
    const sub = subscription ?? ({} as PushSubscriptionInput);
    if (!sub.endpoint) return { ok: false, statusCode: null, error: 'missing endpoint' } as Json;
    const vapid = await resolveVapid(ctx.tenantId);
    try {
      await webpushLib.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        String(payloadJson ?? ''),
        vapid ? { vapidDetails: vapid } : undefined,
      );
      return { ok: true } as Json;
    } catch (e: unknown) {
      const err = e as { statusCode?: number; message?: string };
      return { ok: false, statusCode: err?.statusCode ?? null, error: err?.message ?? 'web push send failed' } as Json;
    }
  },
};
