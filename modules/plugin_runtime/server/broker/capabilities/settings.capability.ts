// settings: plugin-namespaced, non-secret key/value.
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import type { Json } from '../../../sdk/types';
import { SETTING_PREFIX, type BrokerCtx } from '../broker.context';

export const settings = {
  async get(ctx: BrokerCtx, key: string): Promise<Json> {
    return (await SettingService.getValue(ctx.tenantId, SETTING_PREFIX(ctx.pluginId) + String(key))) ?? null;
  },
  async getMany(ctx: BrokerCtx, keys: string[]): Promise<Json> {
    const prefixed = (keys ?? []).map((k) => SETTING_PREFIX(ctx.pluginId) + String(k));
    const rec = await SettingService.getByKeys(ctx.tenantId, prefixed);
    const out: Record<string, string> = {};
    for (const k of keys ?? []) { const v = rec[SETTING_PREFIX(ctx.pluginId) + String(k)]; if (v != null) out[k] = v; }
    return out as Json;
  },
  async set(ctx: BrokerCtx, key: string, value: string): Promise<Json> {
    await SettingService.updateMany(ctx.tenantId, { [SETTING_PREFIX(ctx.pluginId) + String(key)]: String(value) }, { actorId: `plugin:${ctx.pluginId}` });
    return null;
  },
};
