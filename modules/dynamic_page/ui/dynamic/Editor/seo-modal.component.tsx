'use client'

import { Modal } from '@kuraykaraaslan/common/ui/modal.component'
import { useEditorStore } from './stores/editorStore'

function CharCounter({ value, ideal }: { value: string; ideal: [number, number] }) {
  const len = value.length
  const [min, max] = ideal
  const color = len === 0 ? 'text-[var(--text-primary)]/25' : len < min ? 'text-yellow-500' : len <= max ? 'text-green-500' : 'text-red-500'
  return <span className={`text-[10px] font-mono tabular-nums ${color}`}>{len} / {max}</span>
}

function SerpPreview({ title, description, slug }: { title: string; description: string; slug: string }) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'yoursite.com'
  const truncTitle = title.length > 60 ? title.slice(0, 57) + '…' : title
  const truncDesc = description.length > 160 ? description.slice(0, 157) + '…' : description
  return (
    <div className="p-3 rounded-lg bg-[var(--surface-overlay)]/40 border border-[var(--text-primary)]/10 font-sans">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-4 h-4 rounded-full bg-[var(--text-primary)]/20 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-[var(--text-primary)]/70 truncate">{hostname}</p>
          <p className="text-[10px] text-[var(--text-primary)]/40 truncate">{hostname}/{slug || 'page-slug'}</p>
        </div>
      </div>
      <p className="text-sm text-blue-500 leading-snug truncate mb-0.5">
        {truncTitle || <span className="italic text-[var(--text-primary)]/30">No title set</span>}
      </p>
      <p className="text-[11px] text-[var(--text-primary)]/50 leading-relaxed line-clamp-2 min-h-[2.5em]">
        {truncDesc || <span className="italic">No description set</span>}
      </p>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-md text-sm text-[var(--text-primary)] outline-none bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 focus:border-[var(--primary)]/40 transition-colors'

export default function SeoModal() {
  const {
    seoOpen, setSeoOpen,
    title: pageTitle, slug,
    seoData, setSeoField,
  } = useEditorStore()

  return (
    <Modal open={seoOpen} onClose={() => setSeoOpen(false)} title="SEO Settings" size="lg">
      <div className="space-y-6 p-1 overflow-y-auto max-h-[70vh]">
        {/* SERP preview — falls back to page title when SEO override is empty */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]/60 uppercase tracking-wide">Search Preview</h3>
          <SerpPreview
            title={seoData.title || seoData.ogTitle || pageTitle}
            description={seoData.description}
            slug={slug}
          />
        </section>

        <div className="border-t border-[var(--text-primary)]/10" />

        {/* Page-level meta */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]/60 uppercase tracking-wide">Page Meta</h3>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]/55">Meta Title</span>
              <CharCounter value={seoData.title} ideal={[40, 60]} />
            </div>
            <input
              type="text"
              value={seoData.title}
              onChange={(e) => setSeoField('title', e.target.value)}
              placeholder={pageTitle || 'Falls back to page title if empty'}
              className={inputCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]/55">Meta Description</span>
              <CharCounter value={seoData.description} ideal={[120, 160]} />
            </div>
            <textarea
              value={seoData.description}
              onChange={(e) => setSeoField('description', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Describe this page for search engines…"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-primary)]/55 block mb-1">Keywords</label>
            <input
              type="text"
              value={seoData.keywords.join(', ')}
              onChange={(e) => setSeoField('keywords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder="keyword1, keyword2, keyword3"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-primary)]/55 block mb-1">Canonical URL</label>
            <input
              type="url"
              value={seoData.canonicalUrl}
              onChange={(e) => setSeoField('canonicalUrl', e.target.value)}
              placeholder={`https://yoursite.com/${slug}`}
              className={inputCls}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={seoData.noIndex}
                onChange={(e) => setSeoField('noIndex', e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]/60">noindex — hide this page from search engines</span>
            </label>
          </div>
        </section>

        <div className="border-t border-[var(--text-primary)]/10" />

        {/* Open Graph */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]/60 uppercase tracking-wide">Open Graph</h3>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]/55">OG Title</span>
              <CharCounter value={seoData.ogTitle} ideal={[40, 60]} />
            </div>
            <input
              type="text"
              value={seoData.ogTitle}
              onChange={(e) => setSeoField('ogTitle', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]/55">OG Description</span>
              <CharCounter value={seoData.ogDescription} ideal={[120, 160]} />
            </div>
            <textarea
              value={seoData.ogDescription}
              onChange={(e) => setSeoField('ogDescription', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-primary)]/55 block mb-1">OG Image URL</label>
            <input
              type="url"
              value={seoData.ogImageUrl}
              onChange={(e) => setSeoField('ogImageUrl', e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
          </div>
        </section>

        <div className="border-t border-[var(--text-primary)]/10" />

        {/* Twitter Card */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]/60 uppercase tracking-wide">Twitter Card</h3>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]/55">Twitter Title</span>
              <CharCounter value={seoData.twitterTitle} ideal={[40, 60]} />
            </div>
            <input
              type="text"
              value={seoData.twitterTitle}
              onChange={(e) => setSeoField('twitterTitle', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]/55">Twitter Description</span>
              <CharCounter value={seoData.twitterDescription} ideal={[120, 160]} />
            </div>
            <textarea
              value={seoData.twitterDescription}
              onChange={(e) => setSeoField('twitterDescription', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-primary)]/55 block mb-1">Card Type</label>
            <input
              type="text"
              value={seoData.twitterCard}
              onChange={(e) => setSeoField('twitterCard', e.target.value)}
              placeholder="summary_large_image"
              className={inputCls}
            />
          </div>
        </section>
      </div>
    </Modal>
  )
}
