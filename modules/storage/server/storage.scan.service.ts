import Logger from '@nb/logger'
import { TenantUsageService } from '@nb/tenant_usage/server/tenant_usage.service'
import { getProvider } from './storage.provider-factory'
import { createScanner } from './storage.scanner-factory'
import type { ScanConfig, ScanResult } from './storage.scan.types'
import type { UploadedFile } from './entities/uploaded_file.entity'

/**
 * Run a single scan with an already-resolved config. The scanner adapter never
 * throws for ordinary failures (it returns `status: 'error'`), so this is safe
 * to await inline without try/catch — but we guard anyway as defence in depth.
 */
export async function scan(config: ScanConfig, bytes: Uint8Array, filename: string): Promise<ScanResult> {
  try {
    const scanner = createScanner(config)
    return await scanner.scan(bytes, { filename, timeoutMs: config.timeoutMs })
  } catch (error) {
    Logger.warn(`storage scan failed: ${error instanceof Error ? error.message : String(error)}`)
    return { status: 'error', provider: config.provider, detail: 'scan error' }
  }
}

/**
 * React to an infected object. The malicious bytes are ALWAYS removed from the
 * serving location; with `quarantine` they are first copied to the quarantine
 * folder (falling back to plain delete if the copy fails, so an infected object
 * is never left publicly reachable).
 */
export async function handleInfected(
  tenantId: string,
  row: Pick<UploadedFile, 'key' | 'mimeType' | 'size'>,
  bytes: Uint8Array,
  config: ScanConfig,
): Promise<void> {
  const { provider } = await getProvider(tenantId)
  const base = row.key.split('/').pop() || 'file'

  if (config.infectedAction === 'quarantine') {
    try {
      await provider.uploadFile(
        new File([bytes as unknown as BlobPart], base, { type: row.mimeType }),
        { folder: config.quarantineFolder, tenantId },
      )
      await provider.deleteFile(row.key)
      Logger.info(`storage: quarantined infected object ${row.key}`)
      return
    } catch (error) {
      Logger.warn(
        `storage: quarantine failed for ${row.key}, deleting instead: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  await provider.deleteFile(row.key)
  const size = Number(row.size) || 0
  if (size > 0) {
    await TenantUsageService.decrementStorageBytes(tenantId, size).catch(() => {})
  }
  Logger.info(`storage: deleted infected object ${row.key}`)
}
