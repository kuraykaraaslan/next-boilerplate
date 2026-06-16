'use client'

import type { LinkValue } from '../../types'

const inputCls = 'w-full px-2.5 py-1.5 rounded-md text-xs text-[var(--text-primary)] outline-none bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 focus:border-[var(--primary)]/40 transition-colors placeholder:text-[var(--text-primary)]/30'

interface Props {
  value: LinkValue | undefined
  onChange: (v: LinkValue) => void
  placeholder?: string
}

const EMPTY: LinkValue = { label: '', href: '', target: '_self' }

export function LinkField({ value, onChange, placeholder }: Props) {
  const v = value ?? EMPTY
  const set = (patch: Partial<LinkValue>) => onChange({ ...v, ...patch })

  return (
    <div className="space-y-1.5 p-2.5 rounded-lg bg-[var(--surface-overlay)]/40 border border-[var(--text-primary)]/8">
      <input
        type="text"
        value={v.label}
        onChange={(e) => set({ label: e.target.value })}
        placeholder={placeholder || 'Button label'}
        className={inputCls}
      />
      <input
        type="url"
        value={v.href}
        onChange={(e) => set({ href: e.target.value })}
        placeholder="https://… or /path"
        className={inputCls}
      />
      <select
        value={v.target}
        onChange={(e) => set({ target: e.target.value as LinkValue['target'] })}
        className={inputCls}
      >
        <option value="_self">Same tab</option>
        <option value="_blank">New tab</option>
      </select>
    </div>
  )
}
