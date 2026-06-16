import 'reflect-metadata';
import { createHash } from 'node:crypto';
import redis from '@nb/redis';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import type { ExportOptions, ExportManifest } from './tenant_export.types';
import { exportTenantData } from './tenant_export.collect';

// Re-exported so existing `tenant_export.service` import sites keep working.
export type { TenantExportData, ExportOptions, ExportManifest } from './tenant_export.types';

/**
 * Tenant data-export facade. The heavy per-collection gather lives in
 * `tenant_export.collect`; shared types in `tenant_export.types`; field
 * stripping + PII redaction in `tenant_export.helpers`. This class preserves
 * the single `TenantExportService.*` entry point (rate limiting + manifest).
 */
export default class TenantExportService {
  static exportTenantData(tenantId: string, opts: ExportOptions = {}): Promise<Buffer> {
    return exportTenantData(tenantId, opts);
  }

  /**
   * Per-tenant export rate limit (one export per `windowSeconds`, default 1h).
   * Throws 429 when called too soon. Exports are heavy and contain sensitive
   * data, so they must not be triggerable on a tight loop.
   */
  static async assertNotRateLimited(tenantId: string, windowSeconds = 3600): Promise<void> {
    const key = `tenant_export:rate:${tenantId}`;
    const ok = await redis.set(key, '1', 'EX', windowSeconds, 'NX').catch(() => 'OK');
    if (ok !== 'OK') {
      throw new AppError('An export was requested recently. Please try again later.', 429, ErrorCode.RATE_LIMIT_EXCEEDED);
    }
  }

  /**
   * Rate-limited export that also returns a completeness/integrity manifest:
   * a SHA-256 checksum, byte size, and per-collection row counts. The manifest
   * lets the downloader verify the archive was not truncated or tampered with.
   */
  static async exportWithManifest(
    tenantId: string,
    opts: ExportOptions & { skipRateLimit?: boolean } = {},
  ): Promise<{ buffer: Buffer; manifest: ExportManifest }> {
    if (!opts.skipRateLimit) await this.assertNotRateLimited(tenantId);
    const buffer = await this.exportTenantData(tenantId, opts);
    const parsed = JSON.parse(buffer.toString('utf-8')) as Record<string, unknown>;
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) counts[k] = v.length;
    }
    const manifest: ExportManifest = {
      exportedAt: new Date().toISOString(),
      tenantId,
      redacted: Boolean(opts.redactPii),
      sha256: createHash('sha256').update(buffer).digest('hex'),
      sizeBytes: buffer.length,
      counts,
    };
    return { buffer, manifest };
  }
}
