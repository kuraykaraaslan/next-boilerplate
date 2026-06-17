// secrets: read-only, decrypted host-side. The plugin never receives a way to
// list or enumerate secrets — only fetch one it names.
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { decryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import type { Json } from '../../../sdk/types';
import { SECRET_PREFIX, type BrokerCtx } from '../broker.context';

export const secrets = {
  async get(ctx: BrokerCtx, key: string): Promise<Json> {
    const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + String(key));
    if (raw == null) return null;
    const dec = decryptFieldOpt(raw);
    return typeof dec === 'string' ? dec : null;
  },
};
