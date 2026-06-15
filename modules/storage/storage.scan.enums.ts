import { z } from 'zod'

// ============================================================================
// Virus / malware scanning enums
// ============================================================================

/** Online scanning backends. Pluggable — VirusTotal is the first adapter. */
export const VirusScanProviderSchema = z.enum(['virustotal'])
export type VirusScanProvider = z.infer<typeof VirusScanProviderSchema>

/**
 * Lifecycle of an upload's scan:
 *  - skipped  : scanning disabled for the tenant
 *  - pending  : queued for async scan, not yet resolved
 *  - clean    : scanned, no threat
 *  - infected : scanned, threat found (object deleted/quarantined)
 *  - error    : scan could not be completed (network/timeout/provider)
 */
export const VirusScanStatusSchema = z.enum(['skipped', 'pending', 'clean', 'infected', 'error'])
export type VirusScanStatus = z.infer<typeof VirusScanStatusSchema>

/** sync = block the upload until scanned; async = scan in the background. */
export const VirusScanModeSchema = z.enum(['sync', 'async'])
export type VirusScanMode = z.infer<typeof VirusScanModeSchema>

/** What to do with an object once it is found infected. */
export const VirusScanInfectedActionSchema = z.enum(['delete', 'quarantine'])
export type VirusScanInfectedAction = z.infer<typeof VirusScanInfectedActionSchema>
