import webpush from "web-push";
import { prisma } from "@/libs/prisma";
import Logger from "@/libs/logger";
import type { UserRole } from "../user/user.enums";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

// Lazy-init: configure VAPID only on first use so importing this module
// doesn't crash when env vars are missing (e.g. during build or unrelated routes).
let vapidInitialised = false;

function ensureVapid() {
  if (vapidInitialised) return;
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? "info@example.com"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidInitialised = true;
}

export default class NotificationPushService {
  // ── Subscription management ──────────────────────────────────────────────

  /** Subscribe a user to web push. Upserts by endpoint. */
  static async subscribe(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ): Promise<void> {
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  /** Remove all subscriptions for a user. */
  static async unsubscribe(userId: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { userId } });
  }

  /** Remove a single subscription by endpoint. */
  static async unsubscribeByEndpoint(endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  // ── Sending ──────────────────────────────────────────────────────────────

  /** Send to a specific user (all their devices). */
  static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    ensureVapid();
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(sub, payload)));
  }

  /** Send to multiple specific users. */
  static async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    ensureVapid();
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(sub, payload)));
  }

  /** Send to all users with a specific role (e.g. 'ADMIN', 'USER'). */
  static async sendToRole(role: UserRole, payload: PushPayload): Promise<void> {
    ensureVapid();
    const users = await prisma.user.findMany({
      where: { userRole: role },
      select: { userId: true },
    });
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: users.map((u) => u.userId) } },
    });
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(sub, payload)));
  }

  /** Send to all admin users. */
  static async sendToAdmins(payload: PushPayload): Promise<void> {
    await this.sendToRole("ADMIN", payload);
  }

  /** Send to all active subscribers. */
  static async sendToAll(payload: PushPayload): Promise<void> {
    ensureVapid();
    const subs = await prisma.pushSubscription.findMany();
    await Promise.allSettled(subs.map((sub) => this.sendToSubscription(sub, payload)));
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private static async sendToSubscription(
    sub: { id: string; endpoint: string; p256dh: string; auth: string },
    payload: PushPayload
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      // 410 Gone / 404 = expired subscription, clean it up
      if (error.statusCode === 410 || error.statusCode === 404) {
        Logger.warn(`Push subscription ${sub.id} expired (${error.statusCode}), removing.`);
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        Logger.error(`Push notification failed for ${sub.id}: ${error.message}`);
      }
    }
  }
}
