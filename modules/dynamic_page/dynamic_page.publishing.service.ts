import 'reflect-metadata'
import bcrypt from 'bcrypt'
import { tenantDataSourceFor } from '@/modules/db'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { DynamicPage as PageEntity } from './entities/dynamic_page.entity'
import { DynamicPageTranslation as TranslationEntity } from './entities/dynamic_page_translation.entity'
import { DynamicPageVersion as VersionEntity } from './entities/dynamic_page_version.entity'
import DynamicPageMessages from './dynamic_page.messages'

export interface AudienceContext {
  country?: string | null
  language?: string | null
  role?: string | null
}

/**
 * Publishing-lifecycle concerns for CMS pages: scheduling, editorial approval,
 * audience targeting, password protection, language fallback resolution,
 * version history + rollback, and language-aware sitemap generation.
 */
export default class DynamicPagePublishingService {

  // ── Scheduling ──────────────────────────────────────────────────────────────

  /** Whether a page is live right now (status + publishAt/expireAt window). */
  static isLive(page: { status: string; publishAt?: Date | null; expireAt?: Date | null }, now = new Date()): boolean {
    if (page.status !== 'PUBLISHED') return false
    if (page.publishAt && new Date(page.publishAt) > now) return false
    if (page.expireAt && new Date(page.expireAt) < now) return false
    return true
  }

  /** Publish scheduled pages whose publishAt has arrived; expire overdue ones. */
  static async runSchedule(tenantId: string): Promise<{ published: number; expired: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PageEntity)
    const now = new Date()
    const toPublish = await repo.createQueryBuilder('p')
      .where('p."tenantId" = :tenantId', { tenantId })
      .andWhere('p."status" IN (:...s)', { s: ['APPROVED', 'DRAFT'] })
      .andWhere('p."publishAt" IS NOT NULL AND p."publishAt" <= :now', { now })
      .getMany()
    for (const p of toPublish) { p.status = 'PUBLISHED'; await repo.save(p) }
    const expired = await repo.createQueryBuilder('p')
      .where('p."tenantId" = :tenantId', { tenantId })
      .andWhere('p."status" = :pub', { pub: 'PUBLISHED' })
      .andWhere('p."expireAt" IS NOT NULL AND p."expireAt" < :now', { now })
      .getMany()
    for (const p of expired) { p.status = 'ARCHIVED'; await repo.save(p) }
    return { published: toPublish.length, expired: expired.length }
  }

  // ── Approval workflow ───────────────────────────────────────────────────────

  static async transition(tenantId: string, pageId: string, status: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PageEntity)
    const page = await repo.findOne({ where: { tenantId, dynamicPageId: pageId } })
    if (!page) throw new AppError(DynamicPageMessages.PAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    page.status = status
    await repo.save(page)
  }

  static submitForReview(tenantId: string, pageId: string) { return this.transition(tenantId, pageId, 'PENDING_REVIEW') }
  static approve(tenantId: string, pageId: string) { return this.transition(tenantId, pageId, 'APPROVED') }
  static reject(tenantId: string, pageId: string) { return this.transition(tenantId, pageId, 'DRAFT') }

  // ── Audience targeting ──────────────────────────────────────────────────────

  /** Whether a page should be shown to a viewer given country/language/role. */
  static matchesAudience(
    page: { audienceCountries?: string[] | null; audienceLanguages?: string[] | null; audienceRoles?: string[] | null },
    ctx: AudienceContext,
  ): boolean {
    const ok = (list: string[] | null | undefined, val: string | null | undefined) =>
      !list || list.length === 0 || (!!val && list.map((x) => x.toUpperCase()).includes(val.toUpperCase()))
    return ok(page.audienceCountries, ctx.country) && ok(page.audienceLanguages, ctx.language) && ok(page.audienceRoles, ctx.role)
  }

  // ── Password protection ─────────────────────────────────────────────────────

  static async setPassword(tenantId: string, pageId: string, password: string | null): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PageEntity)
    const page = await repo.findOne({ where: { tenantId, dynamicPageId: pageId } })
    if (!page) throw new AppError(DynamicPageMessages.PAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    page.passwordHash = password ? await bcrypt.hash(password, 10) : null
    await repo.save(page)
  }

  static async verifyPassword(tenantId: string, pageId: string, password: string): Promise<boolean> {
    const ds = await tenantDataSourceFor(tenantId)
    const page = await ds.getRepository(PageEntity).findOne({ where: { tenantId, dynamicPageId: pageId }, select: ['dynamicPageId', 'passwordHash'] })
    if (!page?.passwordHash) return true // not protected
    return bcrypt.compare(password, page.passwordHash)
  }

  // ── Language fallback + per-language SEO ────────────────────────────────────

  /**
   * Resolve a page's localized content for `locale` walking a fallback chain
   * (e.g. ['fr-CA','fr','en']); returns the base page fields when no translation
   * matches. Translations carry their own title/description/keywords (per-
   * language SEO).
   */
  static async resolveLocalized(
    tenantId: string, pageId: string, fallbackChain: string[],
  ): Promise<{ locale: string | null; title: string; description: string | null; keywords: string[] }> {
    const ds = await tenantDataSourceFor(tenantId)
    const page = await ds.getRepository(PageEntity).findOne({ where: { tenantId, dynamicPageId: pageId } })
    if (!page) throw new AppError(DynamicPageMessages.PAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const translations = await ds.getRepository(TranslationEntity).find({ where: { tenantId, dynamicPageId: pageId } as never })
    const byLocale = new Map(translations.map((t) => [t.lang.toLowerCase(), t]))
    for (const loc of fallbackChain) {
      const t = byLocale.get(loc.toLowerCase())
      // Per-language title/description; keywords fall back to the base page.
      if (t) return { locale: t.lang, title: t.title, description: t.description ?? null, keywords: page.keywords ?? [] }
    }
    return { locale: null, title: page.title, description: page.description ?? null, keywords: page.keywords ?? [] }
  }

  /**
   * Language-aware sitemap entries for all live pages, with hreflang alternates
   * built from each page's available translations. Feed into SeoRenderService.
   */
  static async sitemapEntries(tenantId: string, baseUrl: string): Promise<Array<{ loc: string; lastmod: Date; alternates: Record<string, string> }>> {
    const ds = await tenantDataSourceFor(tenantId)
    const pages = await ds.getRepository(PageEntity).find({ where: { tenantId, status: 'PUBLISHED' } })
    const base = baseUrl.replace(/\/$/, '')
    const out: Array<{ loc: string; lastmod: Date; alternates: Record<string, string> }> = []
    for (const p of pages) {
      if (!this.isLive(p)) continue
      const translations = await ds.getRepository(TranslationEntity).find({ where: { tenantId, dynamicPageId: p.dynamicPageId } as never })
      const alternates: Record<string, string> = {}
      for (const t of translations) alternates[t.lang] = `${base}/${t.lang}/${p.slug}`
      out.push({ loc: `${base}/${p.slug}`, lastmod: p.updatedAt, alternates })
    }
    return out
  }

  // ── Version history ─────────────────────────────────────────────────────────

  static async listVersions(tenantId: string, pageId: string, limit = 50): Promise<VersionEntity[]> {
    const ds = await tenantDataSourceFor(tenantId)
    return ds.getRepository(VersionEntity).find({
      where: { tenantId, dynamicPageId: pageId }, order: { revision: 'DESC' }, take: Math.min(limit, 200),
    })
  }

  /** Roll a page back to a stored version's content. */
  static async restoreVersion(tenantId: string, pageId: string, versionId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const version = await ds.getRepository(VersionEntity).findOne({ where: { tenantId, versionId, dynamicPageId: pageId } })
    if (!version) throw new AppError(DynamicPageMessages.PAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const repo = ds.getRepository(PageEntity)
    const page = await repo.findOne({ where: { tenantId, dynamicPageId: pageId } })
    if (!page) throw new AppError(DynamicPageMessages.PAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    // Snapshot current before overwriting, then restore.
    await ds.getRepository(VersionEntity).save({
      tenantId, dynamicPageId: pageId, revision: page.revision ?? 1,
      title: page.title, description: page.description, sections: page.sections, metadata: page.metadata, status: page.status,
    })
    page.title = version.title
    page.description = version.description
    page.sections = version.sections
    page.metadata = version.metadata
    page.revision = (page.revision ?? 1) + 1
    await repo.save(page)
  }
}
