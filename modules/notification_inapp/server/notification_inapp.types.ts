import { z } from "zod";

/** Call-to-action button rendered with the notification. */
export const NotificationActionSchema = z.object({
  label: z.string(),
  url: z.string(),
});
export type NotificationAction = z.infer<typeof NotificationActionSchema>;

export const NotificationSchema = z.object({
  notificationId: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  path: z.string().nullable().optional(),
  /** Category for filtering / per-user opt-out (e.g. 'billing', 'security'). */
  type: z.string().nullable().optional(),
  /** Structured CTA. */
  action: NotificationActionSchema.nullable().optional(),
  /** ISO timestamp after which the notification is hidden on read. */
  expiresAt: z.string().datetime().nullable().optional(),
  isRead: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export type NotificationPayload = Pick<Notification, "title" | "message" | "path" | "type" | "action" | "expiresAt"> & {
  /** Whether to also fan out to web-push (default true; quiet hours can suppress). */
  pushFanout?: boolean;
};
