import type { ScanResult } from '../storage.scan.types'

export interface ScanOptions {
  filename: string
  timeoutMs: number
}

/**
 * Pluggable file scanner. Mirrors the storage provider abstraction
 * (`providers/base.provider.ts`): one concrete adapter per online service.
 *
 * Implementations MUST be self-contained for a single scan and MUST NOT throw
 * for ordinary failures (network/timeout/provider error) — they return a
 * `{ status: 'error' }` result so the caller can decide policy. Throwing is
 * reserved for programmer errors (e.g. missing API key).
 */
export default abstract class FileScanner {
  protected apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  abstract scan(bytes: Uint8Array, options: ScanOptions): Promise<ScanResult>
}
