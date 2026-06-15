// Best-effort moderation side effects (webhook / audit / in-app alert). Each
// uses a dynamic import and never blocks or throws into the caller.

/** Best-effort webhook dispatch (dynamic import, never blocks the caller). */
export function emitEvent(tenantId: string, event: string, payload: Record<string, unknown>): void {
  import('@/modules/webhook/webhook.service')
    .then((m) => m.default.dispatchEvent(tenantId, event as never, payload))
    .catch(() => {});
}

/** Best-effort moderation audit log entry. */
export function auditModeration(
  tenantId: string,
  actorId: string | null,
  action: string,
  messageId: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata: Record<string, unknown>,
): void {
  import('@/modules/audit_log/audit_log.service')
    .then((m) =>
      m.default.log({
        tenantId,
        actorId,
        actorType: actorId ? 'USER' : 'SYSTEM',
        action,
        severity,
        resourceType: 'message',
        resourceId: messageId,
        metadata,
      }),
    )
    .catch(() => {});
}

/** Best-effort in-app alert to tenant admins/moderators. */
export function notifyModerators(tenantId: string, title: string, message: string): void {
  import('@/modules/notification_inapp/notification_inapp.service')
    .then((m) =>
      m.default.pushToAdmins(tenantId, {
        title,
        message,
        path: '/admin/messaging/moderation',
        type: 'moderation',
      }),
    )
    .catch(() => {});
}
