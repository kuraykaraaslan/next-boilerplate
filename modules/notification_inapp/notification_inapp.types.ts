import { z } from "zod";

export const NotificationSchema = z.object({
  notificationId: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  path: z.string().nullable().optional(),
  isRead: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export type NotificationPayload = Pick<Notification, "title" | "message" | "path">;
