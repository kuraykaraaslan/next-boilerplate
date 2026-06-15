import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantUsage } from './entities/tenant_usage.entity';
import { METRICS, redisKey } from './tenant_usage.keys';

export async function flushToDb(tenantId: string, month: string): Promise<void> {
  const keys = METRICS.map((m) => redisKey(tenantId, m, month));

  let results: (string | null)[];
  try { results = await redis.mget(...keys); }
  catch (err) {
    Logger.warn(`[TenantUsage] flushToDb Redis read failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  const [rawApiCalls, rawAiTokens, rawStorageBytes, rawEmailSends, rawSmsSends, rawWebhookCalls] = results;

  const apiCalls = rawApiCalls !== null ? parseInt(rawApiCalls, 10) : 0;
  const aiTokens = rawAiTokens !== null ? parseInt(rawAiTokens, 10) : 0;
  const storageBytes = rawStorageBytes !== null ? parseInt(rawStorageBytes, 10) : 0;
  const emailSends = rawEmailSends !== null ? parseInt(rawEmailSends, 10) : 0;
  const smsSends = rawSmsSends !== null ? parseInt(rawSmsSends, 10) : 0;
  const webhookCalls = rawWebhookCalls !== null ? parseInt(rawWebhookCalls, 10) : 0;

  if (
    apiCalls === 0 &&
    aiTokens === 0 &&
    storageBytes === 0 &&
    emailSends === 0 &&
    smsSends === 0 &&
    webhookCalls === 0
  ) {
    return;
  }

  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(TenantUsage);
  let row = await repo.findOne({ where: { tenantId, month } });
  if (!row) {
    row = repo.create({
      tenantId,
      month,
      apiCalls: 0,
      aiTokens: 0,
      storageBytes: 0,
      emailSends: 0,
      smsSends: 0,
      webhookCalls: 0,
    });
  }
  row.apiCalls = apiCalls;
  row.aiTokens = aiTokens;
  row.storageBytes = storageBytes;
  row.emailSends = emailSends;
  row.smsSends = smsSends;
  row.webhookCalls = webhookCalls;
  await repo.save(row);
}

/**
 * Retention purge: delete persisted usage rows older than `keepMonths`
 * (default 24). Meant for a scheduled job. Returns the number deleted.
 */
export async function purgeOldUsage(tenantId: string, keepMonths = 24): Promise<number> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - keepMonths);
  const cutoffMonth = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
  const ds = await tenantDataSourceFor(tenantId);
  const res = await ds.getRepository(TenantUsage)
    .createQueryBuilder()
    .delete()
    .where('tenantId = :tenantId', { tenantId })
    .andWhere('month < :cutoffMonth', { cutoffMonth })
    .execute();
  return res.affected ?? 0;
}
