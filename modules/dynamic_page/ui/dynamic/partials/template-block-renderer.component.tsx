'use client'

import { useEffect } from 'react'

interface Props {
  template: string
  props: Record<string, unknown>
  script?: string
  blockType?: string
  tenantId?: string
}

const replaceTokens = (str: string, props: Record<string, unknown>) =>
  str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = props[key]
    return val !== undefined && val !== null ? String(val) : ''
  })

export default function TemplateBlockRenderer({ template, props, script, blockType, tenantId }: Props) {
  useEffect(() => {
    if (!script || !blockType) return
    const id = `block-script-${blockType}`
    if (document.getElementById(id)) return

    // Inject block context before the script runs so handlers can call the block-action endpoint
    const ctxId = `block-ctx-${blockType}`
    if (!document.getElementById(ctxId)) {
      const ctxEl = document.createElement('script')
      ctxEl.id = ctxId
      const actionUrl = tenantId
        ? `/tenant/${tenantId}/api/dynamic-pages/block-action/${blockType}`
        : ''
      ctxEl.textContent = [
        `window.__blockCtx = window.__blockCtx || {};`,
        `window.__blockCtx['${blockType}'] = {`,
        `  blockType: '${blockType}',`,
        `  tenantId: '${tenantId ?? ''}',`,
        `  actionUrl: '${actionUrl}',`,
        `  fetch: function(path, opts) {`,
        `    return fetch('${actionUrl}' + (path || ''), opts);`,
        `  }`,
        `};`,
      ].join('\n')
      document.body.appendChild(ctxEl)
    }

    const el = document.createElement('script')
    el.id = id
    el.textContent = replaceTokens(script, props)
    document.body.appendChild(el)
  }, [blockType, script, tenantId])

  if (!template) {
    return (
      <div className="py-20 px-6 flex items-center justify-center min-h-40 bg-[var(--surface-raised)] border-2 border-dashed border-[var(--text-primary)]/20">
        <p className="text-[var(--text-primary)]/30 text-sm">Block has no template.</p>
      </div>
    )
  }

  const html = replaceTokens(template, props)
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
