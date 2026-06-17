// events: structured log + scoped audit.
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import Logger from '@kuraykaraaslan/logger';
import type { Json } from '../../../sdk/types';
import type { BrokerCtx } from '../broker.context';

export const events = {
  async log(ctx: BrokerCtx, level: 'info' | 'warn' | 'error', message: string, meta?: Json): Promise<Json> {
    const line = `[plugin:${ctx.pluginId}] ${String(message)}`;
    if (level === 'error') Logger.error(line, meta as object);
    else if (level === 'warn') Logger.warn(line, meta as object);
    else Logger.info(line, meta as object);
    return null;
  },
  async emit(ctx: BrokerCtx, event: string, payload: Json): Promise<Json> {
    await AuditLogService.log({
      tenantId: ctx.tenantId,
      actorId: null,
      action: `plugin.${ctx.pluginId}.${String(event)}`,
      resourceType: 'plugin_event',
      resourceId: ctx.pluginId,
      metadata: { payload } as Record<string, unknown>,
    });
    return null;
  },
};
