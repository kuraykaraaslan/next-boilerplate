'use client'

import { useEffect } from 'react'

interface Props {
  template: string
  props: Record<string, unknown>
  script?: string
  blockType?: string
}

const replaceTokens = (str: string, props: Record<string, unknown>) =>
  str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = props[key]
    return val !== undefined && val !== null ? String(val) : ''
  })

export default function TemplateBlockRenderer({ template, props, script, blockType }: Props) {
  useEffect(() => {
    if (!script || !blockType) return
    const id = `block-script-${blockType}`
    if (document.getElementById(id)) return
    const el = document.createElement('script')
    el.id = id
    el.textContent = replaceTokens(script, props)
    document.body.appendChild(el)
  }, [blockType, script])

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
