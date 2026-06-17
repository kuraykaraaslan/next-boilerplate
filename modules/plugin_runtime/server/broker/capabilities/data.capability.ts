// data: per-(tenant,plugin) KV/document store.
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { PluginKv } from '../../entities/plugin_kv.entity';
import type { Json } from '../../../sdk/types';
import type { BrokerCtx } from '../broker.context';

export const data = {
  async get(ctx: BrokerCtx, collection: string, key: string): Promise<Json> {
    const ds = await tenantDataSourceFor(ctx.tenantId);
    const row = await ds.getRepository(PluginKv).findOne({
      where: { tenantId: ctx.tenantId, pluginId: ctx.pluginId, collection: String(collection), key: String(key) },
    });
    return (row?.value as Json) ?? null;
  },
  async put(ctx: BrokerCtx, collection: string, key: string, value: Json): Promise<Json> {
    const ds = await tenantDataSourceFor(ctx.tenantId);
    const repo = ds.getRepository(PluginKv);
    await repo.upsert(
      { tenantId: ctx.tenantId, pluginId: ctx.pluginId, collection: String(collection), key: String(key), value: value as never },
      ['tenantId', 'pluginId', 'collection', 'key'],
    );
    return null;
  },
  async delete(ctx: BrokerCtx, collection: string, key: string): Promise<Json> {
    const ds = await tenantDataSourceFor(ctx.tenantId);
    await ds.getRepository(PluginKv).delete({
      tenantId: ctx.tenantId, pluginId: ctx.pluginId, collection: String(collection), key: String(key),
    });
    return null;
  },
  async list(ctx: BrokerCtx, collection: string, opts?: { prefix?: string; limit?: number; offset?: number; withValues?: boolean }): Promise<Json> {
    const ds = await tenantDataSourceFor(ctx.tenantId);
    const qb = ds.getRepository(PluginKv).createQueryBuilder('kv')
      .where('kv.tenantId = :t AND kv.pluginId = :p AND kv.collection = :c', { t: ctx.tenantId, p: ctx.pluginId, c: String(collection) });
    if (opts?.prefix) qb.andWhere('kv.key LIKE :pre', { pre: `${opts.prefix}%` });
    qb.orderBy('kv.key', 'ASC').take(Math.min(opts?.limit ?? 100, 500)).skip(opts?.offset ?? 0);
    const rows = await qb.getMany();
    return rows.map((r) => (opts?.withValues ? { key: r.key, value: r.value as Json } : { key: r.key })) as Json;
  },
};
