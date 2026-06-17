import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import { STORAGE_SCAN_KEYS } from './storage.scan.setting.keys'
import { VirusScanProviderSchema, VirusScanModeSchema, VirusScanInfectedActionSchema } from './storage.scan.enums'
import type { ScanConfig } from './storage.scan.types'
import FileScanner from './scanners/base.scanner'
import VirusTotalScanner from './scanners/virustotal.scanner'

const DEFAULT_TIMEOUT_SECONDS = 30
const DEFAULT_QUARANTINE_FOLDER = 'quarantine'

/**
 * Resolve the per-tenant scanning configuration from SettingService. Mirrors
 * `getStorageSettings` — a failed read degrades to "disabled" rather than
 * blocking uploads.
 */
export async function getScanConfig(tenantId: string): Promise<ScanConfig> {
  const s = await SettingService.getByKeys(tenantId, [...STORAGE_SCAN_KEYS]).catch(
    () => ({} as Record<string, string>),
  )

  const provider = VirusScanProviderSchema.safeParse(s.virusScanProvider)
  const mode = VirusScanModeSchema.safeParse(s.virusScanMode)
  const action = VirusScanInfectedActionSchema.safeParse(s.virusScanInfectedAction)
  const timeoutSec = parseInt(s.virusScanTimeoutSeconds ?? '', 10)

  return {
    enabled: s.virusScanEnabled === 'true' && !!s.virusScanApiKey,
    mode: mode.success ? mode.data : 'async',
    provider: provider.success ? provider.data : 'virustotal',
    apiKey: s.virusScanApiKey ?? '',
    timeoutMs: (Number.isFinite(timeoutSec) && timeoutSec > 0 ? timeoutSec : DEFAULT_TIMEOUT_SECONDS) * 1000,
    infectedAction: action.success ? action.data : 'quarantine',
    quarantineFolder: s.virusScanQuarantineFolder || DEFAULT_QUARANTINE_FOLDER,
  }
}

/** Instantiate the scanner adapter for a resolved config. */
export function createScanner(config: ScanConfig): FileScanner {
  switch (config.provider) {
    case 'virustotal':
      return new VirusTotalScanner(config.apiKey)
    default:
      // Schema-validated above; exhaustive switch keeps TS happy on extension.
      return new VirusTotalScanner(config.apiKey)
  }
}
