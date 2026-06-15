import type {
  VirusScanProvider,
  VirusScanStatus,
  VirusScanMode,
  VirusScanInfectedAction,
} from './storage.scan.enums'

/** Resolved per-tenant scanning configuration. */
export interface ScanConfig {
  enabled: boolean
  mode: VirusScanMode
  provider: VirusScanProvider
  apiKey: string
  timeoutMs: number
  infectedAction: VirusScanInfectedAction
  quarantineFolder: string
}

/** Outcome of a single scan. `status` is never 'pending'/'skipped' here. */
export interface ScanResult {
  status: Extract<VirusScanStatus, 'clean' | 'infected' | 'error'>
  provider: VirusScanProvider
  threat?: string   // detected threat / engine name when infected
  detail?: string   // short human-readable summary (stored in audit)
}
