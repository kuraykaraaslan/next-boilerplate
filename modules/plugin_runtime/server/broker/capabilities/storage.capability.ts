// storage: scoped blob storage under plugins/<pluginId>/.
import StorageService from '@kuraykaraaslan/storage/server/storage.service';
import type { Json } from '../../../sdk/types';
import type { BrokerCtx } from '../broker.context';

export const storage = {
  async put(ctx: BrokerCtx, path: string, data: { base64: string; contentType?: string }): Promise<Json> {
    const buffer = Buffer.from(data.base64, 'base64');
    const res = await StorageService.uploadServerBuffer(ctx.tenantId, {
      buffer, filename: String(path).replace(/^\/+/, ''), contentType: data.contentType, folder: `plugins/${ctx.pluginId}`,
    });
    return { key: res.key } as Json;
  },
  async getUrl(ctx: BrokerCtx, path: string, expiresSeconds?: number): Promise<Json> {
    return (await StorageService.getPresignedUrl(ctx.tenantId, String(path), expiresSeconds ?? 900)) as Json;
  },
  async delete(ctx: BrokerCtx, path: string): Promise<Json> {
    await StorageService.deleteFile(ctx.tenantId, { key: String(path) } as never);
    return null;
  },
};
