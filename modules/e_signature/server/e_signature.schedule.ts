import 'reflect-metadata'
import { createQueue, createWorker } from '@nb/redis'
import Logger from '@nb/logger'
import ESignatureTrustListService from './e_signature.trust_list.service'

/**
 * Scheduled e-signature engine maintenance: automatic LOTL / national
 * trust-list refresh (EU LOTL + TR KamuSM). Trust lists drift (TSPs
 * added/removed, certs rotated) so a stale list silently breaks QES validation
 * — this keeps it fresh. Signing-certificate expiry alerting (an auth concern)
 * is scheduled separately by modules/auth_e_signature.
 */
const QUEUE_NAME = 'e-signature-maintenance'

export const eSignatureMaintenanceQueue = createQueue(QUEUE_NAME)
let _worker: ReturnType<typeof createWorker> | null = null
let _scheduled = false

function startWorker() {
  if (_worker) return _worker
  _worker = createWorker(QUEUE_NAME, async () => {
    const tl = await ESignatureTrustListService.ingestAll().catch((e) => {
      Logger.warn(`[e_signature] trust-list refresh failed: ${e instanceof Error ? e.message : e}`); return { etsi: 0, tr: 0 }
    })
    Logger.info(`[e_signature] maintenance: LOTL=${tl.etsi} TR=${tl.tr}`)
    return { ...tl }
  }, { concurrency: 1 })
  _worker.on('failed', (job, err) => Logger.error(`[e_signature] maintenance job ${job?.id} failed: ${err.message}`))
  return _worker
}

/** Schedule recurring maintenance (default: daily at 03:00). Call once at boot. */
export async function scheduleESignatureMaintenance(cronPattern = '0 3 * * *'): Promise<void> {
  if (_scheduled) return
  _scheduled = true
  startWorker()
  await eSignatureMaintenanceQueue.add('maintenance', {}, {
    repeat: { pattern: cronPattern }, jobId: 'e-signature-maintenance-recurring',
    removeOnComplete: 20, removeOnFail: 50,
  })
  Logger.info(`[e_signature] maintenance scheduled: ${cronPattern}`)
}
