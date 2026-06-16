import { createHash } from 'node:crypto'
import axios from 'axios'
import Logger from '@nb/logger'
import SettingService from '@nb/setting/server/setting.service'

/**
 * Media intelligence: AI alt-text generation (vision), CSAM hash-matching, and
 * perceptual-hash deduplication. All are real and per-tenant-configurable —
 * unconfigured features simply don't run (no mock). Vision uses a real
 * OpenAI-compatible vision endpoint; CSAM/pHash use real configurable
 * hash-matching services (PhotoDNA-style / Cloudflare CSAM / generic HTTP).
 */
export default class MediaGalleryIntelligenceService {

  // ── Exact-content hashing (always available) ────────────────────────────────

  static contentHash(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex')
  }

  /** Fetch an object's bytes and compute its sha256 (for exact dedup). */
  static async contentHashFromUrl(url: string): Promise<string | null> {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000, maxContentLength: 25 * 1024 * 1024 })
      return this.contentHash(Buffer.from(res.data))
    } catch (e) {
      Logger.warn(`[media] content hash failed: ${e instanceof Error ? e.message : e}`)
      return null
    }
  }

  // ── AI alt-text (vision) ────────────────────────────────────────────────────

  /**
   * Generate descriptive alt text for an image via a real vision model.
   * Provider/key from settings (`mediaAltTextProvider`=openai|generic). Returns
   * null when unconfigured. OpenAI path uses the chat-completions vision API.
   */
  static async generateAltText(tenantId: string, imageUrl: string, opts?: { language?: string }): Promise<string | null> {
    const s = await SettingService.getByKeys(tenantId, ['mediaAltTextProvider', 'mediaAltTextApiKey', 'mediaAltTextUrl', 'mediaAltTextModel'])
      .catch(() => ({} as Record<string, string | null>))
    const provider = (s.mediaAltTextProvider || '').toLowerCase()
    const lang = opts?.language ? ` Respond in ${opts.language}.` : ''
    const prompt = `Write a concise, descriptive alt-text (max 125 chars) for this image for accessibility. Return only the alt text, no quotes.${lang}`
    try {
      if (provider === 'openai' && s.mediaAltTextApiKey) {
        const res = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: s.mediaAltTextModel || 'gpt-4o-mini',
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ] }],
          max_tokens: 80,
        }, { headers: { Authorization: `Bearer ${s.mediaAltTextApiKey}`, 'Content-Type': 'application/json' }, timeout: 20000 })
        const text = res.data?.choices?.[0]?.message?.content
        return typeof text === 'string' ? text.trim().slice(0, 300) : null
      }
      if (provider === 'generic' && s.mediaAltTextUrl) {
        const res = await axios.post(s.mediaAltTextUrl, { url: imageUrl, language: opts?.language }, {
          headers: s.mediaAltTextApiKey ? { Authorization: `Bearer ${s.mediaAltTextApiKey}` } : undefined, timeout: 20000,
        })
        const text = res.data?.altText ?? res.data?.text ?? res.data?.caption
        return typeof text === 'string' ? text.trim().slice(0, 300) : null
      }
    } catch (e) {
      Logger.warn(`[media] alt-text generation failed: ${e instanceof Error ? e.message : e}`)
    }
    return null
  }

  // ── CSAM hash-matching ──────────────────────────────────────────────────────

  /**
   * Scan an image against a CSAM hash-matching service (PhotoDNA-style /
   * Cloudflare CSAM / generic). Returns { match } when configured, else null
   * (scan not run). A `match: true` result must block the upload.
   */
  static async csamScan(tenantId: string, imageUrl: string): Promise<{ match: boolean; provider: string } | null> {
    const s = await SettingService.getByKeys(tenantId, ['mediaCsamUrl', 'mediaCsamApiKey'])
      .catch(() => ({} as Record<string, string | null>))
    if (!s.mediaCsamUrl) return null
    try {
      const res = await axios.post(s.mediaCsamUrl, { url: imageUrl }, {
        headers: s.mediaCsamApiKey ? { Authorization: `Bearer ${s.mediaCsamApiKey}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
        timeout: 15000,
      })
      const data = res.data ?? {}
      const match = Boolean(data.match ?? data.isMatch ?? data.flagged ?? data.csam)
      return { match, provider: 'csam' }
    } catch (e) {
      Logger.warn(`[media] CSAM scan failed: ${e instanceof Error ? e.message : e}`)
      return null // fail-open on provider outage (don't block uploads on errors)
    }
  }

  // ── Perceptual hashing (near-duplicate detection) ───────────────────────────

  /**
   * Compute a perceptual hash via a configurable service (`mediaPhashUrl`).
   * Returns null when unconfigured (perceptual hashing requires image decoding,
   * delegated to a real service). Exact dedup via contentHash is always available.
   */
  static async perceptualHash(tenantId: string, imageUrl: string): Promise<string | null> {
    const s = await SettingService.getByKeys(tenantId, ['mediaPhashUrl', 'mediaPhashApiKey'])
      .catch(() => ({} as Record<string, string | null>))
    if (!s.mediaPhashUrl) return null
    try {
      const res = await axios.post(s.mediaPhashUrl, { url: imageUrl }, {
        headers: s.mediaPhashApiKey ? { Authorization: `Bearer ${s.mediaPhashApiKey}` } : undefined, timeout: 15000,
      })
      const hash = res.data?.hash ?? res.data?.phash
      return typeof hash === 'string' ? hash : null
    } catch (e) {
      Logger.warn(`[media] pHash failed: ${e instanceof Error ? e.message : e}`)
      return null
    }
  }

  /** Hamming distance between two equal-length hex hashes (perceptual similarity). */
  static hammingDistance(a: string, b: string): number {
    if (!a || !b || a.length !== b.length) return Number.MAX_SAFE_INTEGER
    let dist = 0
    for (let i = 0; i < a.length; i++) {
      let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
      while (x) { dist += x & 1; x >>= 1 }
    }
    return dist
  }
}
