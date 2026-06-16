import 'reflect-metadata';
import { createQueue, createWorker } from '@nb/redis';
import Logger from '@nb/logger';
import AuthESignatureCertAlertsService from './auth_e_signature.cert_alerts';

/**
 * Scheduled signing-certificate expiry alerting. Bound certificates rotate /
 * expire; this surfaces the ones expiring soon as platform webhooks so users
 * can re-bind before losing e-signature login. (Trust-list refresh is a
 * separate engine job — see modules/e_signature/e_signature.schedule.ts.)
 */
const QUEUE_NAME = 'auth-e-signature-cert-alerts';

export const authESignatureCertAlertsQueue = createQueue(QUEUE_NAME);
let _worker: ReturnType<typeof createWorker> | null = null;
let _scheduled = false;

function startWorker() {
  if (_worker) return _worker;
  _worker = createWorker(QUEUE_NAME, async () => {
    const alerted = await AuthESignatureCertAlertsService.sweepExpiringCerts(30).catch((e) => {
      Logger.warn(`[auth_e_signature] cert-expiry sweep failed: ${e instanceof Error ? e.message : e}`); return 0;
    });
    Logger.info(`[auth_e_signature] cert-expiry sweep: alerts=${alerted}`);
    return { alerted };
  }, { concurrency: 1 });
  _worker.on('failed', (job, err) => Logger.error(`[auth_e_signature] cert-alert job ${job?.id} failed: ${err.message}`));
  return _worker;
}

/** Schedule recurring cert-expiry sweeps (default: daily at 03:30). Call once at boot. */
export async function scheduleESignatureCertAlerts(cronPattern = '30 3 * * *'): Promise<void> {
  if (_scheduled) return;
  _scheduled = true;
  startWorker();
  await authESignatureCertAlertsQueue.add('cert-alerts', {}, {
    repeat: { pattern: cronPattern }, jobId: 'auth-e-signature-cert-alerts-recurring',
    removeOnComplete: 20, removeOnFail: 50,
  });
  Logger.info(`[auth_e_signature] cert-expiry alerts scheduled: ${cronPattern}`);
}
