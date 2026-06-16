import 'reflect-metadata'
import { In } from 'typeorm'
import { createQueue, createWorker } from '@nb/redis'
import { tenantDataSourceFor } from '@nb/db'
import Logger from '@nb/logger'
import { PushSubscription as PushSubscriptionEntity } from './entities/push_subscription.entity'
import { TenantMember } from '@nb/tenant_member/server/entities/tenant_member.entity'
import NotificationPushService, { type PushPayload } from './notification_push.service'

/**
 * Async push fan-out via BullMQ. Large broadcasts (sendToAll / sendToRole) must
 * not block the request thread or hit web-push serially for thousands of
 * subscribers — instead we enqueue one job per recipient user and let workers
 * deliver concurrently with retry/backoff. Per-user delivery reuses
 * NotificationPushService.sendToUser (category + quiet-hours aware).
 */

const QUEUE_NAME = 'notification-push-fanout'

interface PushFanoutJob {
  tenantId: string
  userId: string
  payload: PushPayload
  category?: string
  respectQuietHours?: boolean
}

export const pushFanoutQueue = createQueue<PushFanoutJob>(QUEUE_NAME)

let _worker: ReturnType<typeof createWorker<PushFanoutJob>> | null = null

/** Start the fan-out worker (call once at boot in long-running deployments). */
export function startPushFanoutWorker() {
  if (_worker) return _worker
  _worker = createWorker<PushFanoutJob>(QUEUE_NAME, async (job) => {
    const { tenantId, userId, payload, category, respectQuietHours } = job.data
    await NotificationPushService.sendToUser(tenantId, userId, payload, { category, respectQuietHours })
  }, { concurrency: 10 })
  _worker.on('failed', (job, err) => Logger.warn(`[push-fanout] job ${job?.id} failed: ${err.message}`))
  return _worker
}

async function enqueueUsers(tenantId: string, userIds: string[], payload: PushPayload, opts?: { category?: string; respectQuietHours?: boolean }) {
  const unique = [...new Set(userIds)]
  await pushFanoutQueue.addBulk(unique.map((userId) => ({
    name: 'fanout',
    data: { tenantId, userId, payload, category: opts?.category, respectQuietHours: opts?.respectQuietHours },
    opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 },
  })))
  return unique.length
}

export default class NotificationPushFanout {
  /** Enqueue a broadcast to every subscriber in the tenant. */
  static async sendToAllAsync(tenantId: string, payload: PushPayload, opts?: { category?: string; respectQuietHours?: boolean }): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId)
    const subs = await ds.getRepository(PushSubscriptionEntity).find({ where: { tenantId }, select: ['userId'] })
    return enqueueUsers(tenantId, subs.map((s) => s.userId), payload, opts)
  }

  /** Enqueue a broadcast to every active member with the given role. */
  static async sendToRoleAsync(tenantId: string, role: string, payload: PushPayload, opts?: { category?: string; respectQuietHours?: boolean }): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId)
    const members = await ds.getRepository(TenantMember).find({ where: { tenantId, memberRole: role, memberStatus: 'ACTIVE' }, select: ['userId'] })
    return enqueueUsers(tenantId, members.map((m) => m.userId), payload, opts)
  }

  /** Enqueue delivery to an explicit set of users. */
  static async sendToUsersAsync(tenantId: string, userIds: string[], payload: PushPayload, opts?: { category?: string; respectQuietHours?: boolean }): Promise<number> {
    return enqueueUsers(tenantId, userIds, payload, opts)
  }
}
