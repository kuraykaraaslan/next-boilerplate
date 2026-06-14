import SettingService from '@/modules/setting/setting.service'

const DEFAULT_SRCSET_WIDTHS = [320, 640, 960, 1280, 1920]

/**
 * Media URL helpers: per-tenant CDN region routing and responsive srcset
 * generation. Image CDNs (Cloudflare Images, imgix, Next image loader, etc.)
 * accept a width query param — we emit a real `srcset` string the frontend can
 * drop into an <img>/<source>. CDN routing rewrites the object origin to the
 * tenant's configured CDN base (closest region).
 */
export default class MediaGalleryUrlService {

  /** Rewrite an object URL onto the tenant's CDN base host (region routing). */
  static async cdnUrl(tenantId: string, url: string): Promise<string> {
    if (!url) return url
    try {
      const base = await SettingService.getValue(tenantId, 'mediaCdnBaseUrl').catch(() => null)
      if (!base) return url
      const parsed = new URL(url)
      const cdn = base.replace(/\/$/, '')
      return `${cdn}${parsed.pathname}${parsed.search}`
    } catch {
      return url
    }
  }

  /** Build a responsive srcset string for an image URL across widths. */
  static srcset(url: string, widths: number[] = DEFAULT_SRCSET_WIDTHS): string {
    if (!url) return ''
    const sep = url.includes('?') ? '&' : '?'
    return widths.map((w) => `${url}${sep}w=${w} ${w}w`).join(', ')
  }

  /** Whether a mime type is a video (drives video gallery rendering). */
  static isVideo(mimeType?: string | null): boolean {
    return Boolean(mimeType && mimeType.toLowerCase().startsWith('video/'))
  }

  /** Whether a mime type is an image. */
  static isImage(mimeType?: string | null): boolean {
    return Boolean(mimeType && mimeType.toLowerCase().startsWith('image/'))
  }
}
