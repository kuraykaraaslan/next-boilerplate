import { Queue, Worker, Job } from 'bullmq';
import { getBullMQConnection } from '@/modules/redis/redis.bullmq';
import { getSystemDataSource } from '@/modules/db';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import AuditLogService from './audit_log.service';
import Logger from '@/modules/logger';

/**
 * Automated retention purge sweep. For every tenant, runs
 * AuditLogService.purgeExpired — which is a no-op for tenants whose
 * `auditLogRetentionDays` is 0 (keep forever). Tenants with a configured
 * retention window have rows older than the window hard-deleted.
 *
 * Two trigger paths, pick one per deployment:
 *  - Self-hosted: call `scheduleAuditPurgeJob()` once at app startup.
 *  - Serverless: invoke `runAuditPurgeSweep()` from a cron route guarded by
 *    the platform CRON_SECRET (mirrors auth.dormant.job).
 *
 * NOTE: archive-before-delete is wired through the service's optional
 * `AuditArchiveExporter` seam; this sweep purges without an exporter (in-DB
 * hash-chain remains the tamper-evidence). Pass an exporter from a custom job
 * if cold-storage export is required.
 */
const QUEUE_NAME = 'audit-log-purge';

export const auditPurgeQueue = new Queue(QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export async function runAuditPurgeSweep(): Promise<{ tenants: number; purged: number }> {
  const systemDs = await getSystemDataSource();
  const tenants = await systemDs.getRepository(Tenant).find();
  let purged = 0;
  for (const tenant of tenants) {
    try {
      const result = await AuditLogService.purgeExpired({ tenantId: tenant.tenantId, archive: false });
      purged += result.purged;
    } catch (err) {
      Logger.error(`[CronJob:audit-log-purge] tenant=${tenant.tenantId} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { tenants: tenants.length, purged };
}

export const auditPurgeWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const { tenants, purged } = await runAuditPurgeSweep();
    Logger.info(`[CronJob:audit-log-purge] tenants=${tenants} purged=${purged}`);
    return { tenants, purged };
  },
  {
    connection: getBullMQConnection(),
    concurrency: 1,
  },
);

auditPurgeWorker.on('failed', (job, err) => {
  Logger.error(`[CronJob:audit-log-purge] Job ${job?.id} failed: ${err.message}`);
});

let _scheduled = false;

export async function scheduleAuditPurgeJob(
  cronPattern = '0 4 * * *', // default: daily 04:00
): Promise<void> {
  if (_scheduled) return;
  _scheduled = true;

  await auditPurgeQueue.add(
    'purge-expired',
    {},
    {
      repeat: { pattern: cronPattern },
      jobId: 'audit-log-purge-recurring',
    },
  );

  Logger.info(`[CronJob:audit-log-purge] Scheduled with pattern: ${cronPattern}`);
}
