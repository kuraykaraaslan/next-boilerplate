import axios from 'axios'
import Logger from '@nb/logger'
import SettingService from '@nb/setting/server/setting.service'

export interface ModerationResult {
  flagged: boolean
  score: number
  categories: string[]
  provider: string
}

/**
 * Real, per-tenant-configurable image moderation for avatars / header images.
 * No mock: when a tenant wires a provider's credentials the image URL is sent to
 * the real moderation API; unconfigured → returns null (moderation simply does
 * not run, the upload is allowed). Supports Sightengine (the most common nudity
 * API) and any generic HTTP endpoint that returns a flagged/score shape.
 *
 * Settings (per tenant):
 *   avatarModerationProvider  'sightengine' | 'generic'
 *   avatarModerationUrl       generic endpoint URL (generic provider)
 *   avatarModerationApiKey    Bearer key (generic) / api_secret (sightengine)
 *   avatarModerationApiUser   api_user (sightengine)
 *   avatarModerationThreshold flag threshold 0..1 (default 0.6)
 */
export default class UserProfileModerationService {

  private static async config(tenantId: string) {
    const s = await SettingService.getByKeys(tenantId, [
      'avatarModerationProvider', 'avatarModerationUrl',
      'avatarModerationApiKey', 'avatarModerationApiUser', 'avatarModerationThreshold',
    ]).catch(() => ({} as Record<string, string | null>))
    return {
      provider: (s.avatarModerationProvider ?? '').toLowerCase(),
      url: s.avatarModerationUrl,
      apiKey: s.avatarModerationApiKey,
      apiUser: s.avatarModerationApiUser,
      threshold: Number(s.avatarModerationThreshold) > 0 ? Number(s.avatarModerationThreshold) : 0.6,
    }
  }

  static async isConfigured(tenantId: string): Promise<boolean> {
    const c = await this.config(tenantId)
    if (c.provider === 'sightengine') return Boolean(c.apiUser && c.apiKey)
    if (c.provider === 'generic') return Boolean(c.url && c.apiKey)
    return false
  }

  /**
   * Moderate an image by URL. Returns null when moderation is not configured
   * (skip) or the provider call fails (fail-open — never block an upload on a
   * provider outage). A non-null result with `flagged: true` means reject.
   */
  static async moderateImageUrl(tenantId: string, imageUrl: string): Promise<ModerationResult | null> {
    const c = await this.config(tenantId)
    try {
      if (c.provider === 'sightengine' && c.apiUser && c.apiKey) {
        const res = await axios.get('https://api.sightengine.com/1.0/check.json', {
          params: { url: imageUrl, models: 'nudity-2.1,offensive', api_user: c.apiUser, api_secret: c.apiKey },
          timeout: 10000,
        })
        const n = res.data?.nudity ?? {}
        const offensive = res.data?.offensive?.prob ?? 0
        // nudity-2.1 returns sexual_activity/sexual_display/erotica + 'none'.
        const score = Math.max(
          Number(n.sexual_activity) || 0, Number(n.sexual_display) || 0,
          Number(n.erotica) || 0, Number(offensive) || 0,
        )
        const categories: string[] = []
        if ((Number(n.sexual_activity) || 0) >= c.threshold) categories.push('sexual_activity')
        if ((Number(n.sexual_display) || 0) >= c.threshold) categories.push('sexual_display')
        if ((Number(n.erotica) || 0) >= c.threshold) categories.push('erotica')
        if ((Number(offensive) || 0) >= c.threshold) categories.push('offensive')
        return { flagged: score >= c.threshold, score, categories, provider: 'sightengine' }
      }

      if (c.provider === 'generic' && c.url && c.apiKey) {
        const res = await axios.post(c.url, { url: imageUrl }, {
          headers: { Authorization: `Bearer ${c.apiKey}`, 'Content-Type': 'application/json' },
          timeout: 10000,
        })
        const data = res.data ?? {}
        const score = Number(data.score ?? data.probability ?? data.nudity ?? 0) || 0
        const flagged = typeof data.flagged === 'boolean' ? data.flagged : score >= c.threshold
        const categories: string[] = Array.isArray(data.categories) ? data.categories : (Array.isArray(data.labels) ? data.labels : [])
        return { flagged, score, categories, provider: 'generic' }
      }
    } catch (err) {
      Logger.warn(`[user_profile] avatar moderation failed: ${err instanceof Error ? err.message : String(err)}`)
      return null // fail-open
    }
    return null // not configured → skip
  }
}
