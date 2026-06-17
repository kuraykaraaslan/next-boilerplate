import FileScanner, { type ScanOptions } from './base.scanner'
import type { ScanResult } from '../storage.scan.types'
import Logger from '@kuraykaraaslan/logger'

const VT_BASE = 'https://www.virustotal.com/api/v3'
const POLL_INTERVAL_MS = 3000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * VirusTotal v3 adapter. Uploads the bytes, then polls the analysis until it
 * completes or the time budget runs out. A file is "infected" when any engine
 * flags it as malicious or suspicious.
 *
 * Network / timeout / provider errors resolve to `{ status: 'error' }` rather
 * than throwing — the caller (storage.scan.service) decides what to do.
 */
export default class VirusTotalScanner extends FileScanner {
  async scan(bytes: Uint8Array, options: ScanOptions): Promise<ScanResult> {
    const deadline = Date.now() + options.timeoutMs
    try {
      const analysisId = await this.uploadForAnalysis(bytes, options)
      if (!analysisId) return { status: 'error', provider: 'virustotal', detail: 'upload failed' }

      while (Date.now() < deadline) {
        const analysis = await this.fetchAnalysis(analysisId, deadline)
        const status = analysis?.data?.attributes?.status
        if (status === 'completed') {
          const stats = analysis.data.attributes.stats ?? {}
          const malicious = Number(stats.malicious ?? 0)
          const suspicious = Number(stats.suspicious ?? 0)
          if (malicious + suspicious > 0) {
            return {
              status: 'infected',
              provider: 'virustotal',
              threat: `${malicious} malicious / ${suspicious} suspicious engines`,
              detail: `VirusTotal: malicious=${malicious} suspicious=${suspicious}`,
            }
          }
          return { status: 'clean', provider: 'virustotal', detail: 'VirusTotal: no detections' }
        }
        await sleep(POLL_INTERVAL_MS)
      }
      return { status: 'error', provider: 'virustotal', detail: 'scan timed out' }
    } catch (error) {
      Logger.warn(`VirusTotalScanner.scan failed: ${error instanceof Error ? error.message : String(error)}`)
      return { status: 'error', provider: 'virustotal', detail: 'provider error' }
    }
  }

  /** POST the file, returning the analysis id (or null on failure). */
  private async uploadForAnalysis(bytes: Uint8Array, options: ScanOptions): Promise<string | null> {
    const form = new FormData()
    form.append('file', new Blob([bytes as unknown as BlobPart]), options.filename)

    const res = await fetch(`${VT_BASE}/files`, {
      method: 'POST',
      headers: { 'x-apikey': this.apiKey },
      body: form,
      signal: AbortSignal.timeout(Math.max(1000, Math.min(options.timeoutMs, 60000))),
    })
    if (!res.ok) {
      Logger.warn(`VirusTotal upload returned ${res.status}`)
      return null
    }
    const json = await res.json()
    return json?.data?.id ?? null
  }

  /** GET the analysis result. Per-request timeout bounded by the deadline. */
  private async fetchAnalysis(analysisId: string, deadline: number): Promise<any> {
    const remaining = Math.max(1000, deadline - Date.now())
    const res = await fetch(`${VT_BASE}/analyses/${encodeURIComponent(analysisId)}`, {
      headers: { 'x-apikey': this.apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(Math.min(remaining, 30000)),
    })
    if (!res.ok) {
      Logger.warn(`VirusTotal analysis poll returned ${res.status}`)
      return null
    }
    return res.json()
  }
}
