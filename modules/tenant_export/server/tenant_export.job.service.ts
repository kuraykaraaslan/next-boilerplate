import 'reflect-metadata'
import { createHash } from 'node:crypto'
import { LessThan, In } from 'typeorm'
import { tenantDataSourceFor } from '@nb/db'
import { createQueue, createWorker } from '@nb/redis'
import Logger from '@nb/logger'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { TenantExportJob, type ExportFormat } from './entities/tenant_export_job.entity'
import TenantExportService from './tenant_export.service'
import { serializeExport } from './tenant_export.format'

const QUEUE_NAME = 'tenant-export'
const DEFAULT_EXPIRY_HOURS = 72
const SIGNED_URL_TTL = 60 * 60 * 24 // 24h signed link

interface ExportJobData { tenantId: string; exportJobId: string }

export const tenantExportQueue = createQueue<ExportJobData>(QUEUE_NAME)
let _worker: ReturnType<typeof createWorker<ExportJobData>> | null = null

export interface CreateExportJobInput {
  format?: ExportFormat
  redactPii?: boolean
  collections?: string[]
  deliverToEmail?: string
  requestedByUserId?: string
  expiryHours?: number
}

/**
 * Asynchronous tenant data export: a job runs the (heavy) export off the request
 * path, serializes to the chosen format, stores the artifact in S3, generates a
 * signed download URL, optionally emails it, and tracks lifecycle/expiry so the
 * artifact is auto-deleted. This is the production-grade GDPR data-portability
 * path (the synchronous exporter times out on large tenants).
 */
export default class TenantExportJobService {

  /** Enqueue an async export job; returns the job row (PENDING). */
  static async createJob(tenantId: string, input: CreateExportJobInput = {}): Promise<TenantExportJob> {
    // The async job is the rate-limit gate (one in-flight/recent export per tenant).
    await TenantExportService.assertNotRateLimited(tenantId)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TenantExportJob)
    const job = await repo.save(repo.create({
      tenantId,
      status: 'PENDING',
      format: input.format ?? 'JSON',
      redacted: Boolean(input.redactPii),
      collections: input.collections ?? null,
      deliverToEmail: input.deliverToEmail ?? null,
      requestedByUserId: input.requestedByUserId ?? null,
    }))
    await tenantExportQueue.add('export', { tenantId, exportJobId: job.exportJobId }, {
      attempts: 2, backoff: { type: 'exponential', delay: 10000 }, removeOnComplete: 100, removeOnFail: 200,
    })
    return job
  }

  /** Run a single export job (called by the worker). */
  static async processJob(tenantId: string, exportJobId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TenantExportJob)
    const job = await repo.findOne({ where: { tenantId, exportJobId } })
    if (!job) return
    job.status = 'RUNNING'
    await repo.save(job)

    try {
      // Build the export (rate limit already enforced at job creation).
      const { buffer: jsonBuffer } = await TenantExportService.exportWithManifest(tenantId, {
        redactPii: job.redacted, collections: job.collections ?? undefined, skipRateLimit: true,
      })
      const data = JSON.parse(jsonBuffer.toString('utf-8')) as Record<string, unknown>
      const { buffer, contentType, ext } = serializeExport(data, job.format)

      const filename = `tenant-export-${tenantId}-${Date.now()}.${ext}`
      const sha256 = createHash('sha256').update(buffer).digest('hex')

      // Store to S3 + presigned URL.
      const { default: StorageService } = await import('@nb/storage/server/storage.service')
      const uploaded = await StorageService.uploadServerBuffer(tenantId, { buffer, filename, contentType, folder: 'exports' })
      const downloadUrl = await StorageService.getPresignedUrl(tenantId, uploaded.key, SIGNED_URL_TTL).catch(() => uploaded.url)

      const expiryHours = DEFAULT_EXPIRY_HOURS
      job.status = 'COMPLETED'
      job.storageKey = uploaded.key
      job.downloadUrl = downloadUrl
      job.sizeBytes = buffer.length
      job.sha256 = sha256
      job.completedAt = new Date()
      job.expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)
      await repo.save(job)

      if (job.deliverToEmail) await this.emailLink(tenantId, job.deliverToEmail, downloadUrl, job.expiresAt)
    } catch (err) {
      job.status = 'FAILED'
      job.error = err instanceof Error ? err.message : String(err)
      await repo.save(job).catch(() => {})
      Logger.error(`[tenant_export] job ${exportJobId} failed: ${job.error}`)
    }
  }

  private static async emailLink(tenantId: string, email: string, url: string, expiresAt: Date): Promise<void> {
    try {
      const { default: NotificationMailQueueService } = await import('@nb/notification_mail/server/notification_mail.queue.service')
      await NotificationMailQueueService.sendMail(tenantId, email, 'Your data export is ready',
        `<p>Your tenant data export is ready.</p><p><a href="${url}">Download</a> (link expires ${expiresAt.toISOString()}).</p>`)
    } catch (e) {
      Logger.warn(`[tenant_export] export email failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  static async getJob(tenantId: string, exportJobId: string): Promise<TenantExportJob> {
    const ds = await tenantDataSourceFor(tenantId)
    const job = await ds.getRepository(TenantExportJob).findOne({ where: { tenantId, exportJobId } })
    if (!job) throw new AppError('Export job not found', 404, ErrorCode.NOT_FOUND)
    return job
  }

  static async listJobs(tenantId: string, limit = 50): Promise<TenantExportJob[]> {
    const ds = await tenantDataSourceFor(tenantId)
    return ds.getRepository(TenantExportJob).find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: Math.min(limit, 200) })
  }

  /** Refresh the signed URL for a completed export (links are short-lived). */
  static async refreshDownloadUrl(tenantId: string, exportJobId: string): Promise<string> {
    const job = await this.getJob(tenantId, exportJobId)
    if (job.status !== 'COMPLETED' || !job.storageKey) throw new AppError('Export not available', 409, ErrorCode.CONFLICT)
    if (job.expiresAt && job.expiresAt < new Date()) throw new AppError('Export has expired', 410, ErrorCode.NOT_FOUND)
    const { default: StorageService } = await import('@nb/storage/server/storage.service')
    const url = await StorageService.getPresignedUrl(tenantId, job.storageKey, SIGNED_URL_TTL)
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(TenantExportJob).update({ tenantId, exportJobId }, { downloadUrl: url })
    return url
  }

  /**
   * Delete expired export artifacts (S3 object + scrub the row) and mark them
   * EXPIRED. Meant for a scheduled sweep.
   */
  static async sweepExpired(tenantId: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(TenantExportJob)
    const expired = await repo.find({
      where: { tenantId, status: In(['COMPLETED']), expiresAt: LessThan(new Date()) },
    })
    let n = 0
    const { default: StorageService } = await import('@nb/storage/server/storage.service')
    for (const job of expired) {
      if (job.storageKey) await StorageService.deleteFile(tenantId, { key: job.storageKey }).catch(() => {})
      job.status = 'EXPIRED'
      job.downloadUrl = null
      job.storageKey = null
      await repo.save(job).catch(() => {})
      n++
    }
    return n
  }

  /** Start the export worker (call once at boot in long-running deployments). */
  static startWorker() {
    if (_worker) return _worker
    _worker = createWorker<ExportJobData>(QUEUE_NAME, async (job) => {
      await TenantExportJobService.processJob(job.data.tenantId, job.data.exportJobId)
    }, { concurrency: 2 })
    _worker.on('failed', (job, err) => Logger.warn(`[tenant_export] worker job ${job?.id} failed: ${err.message}`))
    return _worker
  }
}
