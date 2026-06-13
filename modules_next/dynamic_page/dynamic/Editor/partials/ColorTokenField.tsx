'use client'

import { useState, useRef, useEffect } from 'react'

// Design token catalogue — all CSS variables used across blocks
const TOKENS: Array<{ label: string; variable: string }> = [
  { label: 'Primary',          variable: '--primary' },
  { label: 'Secondary',        variable: '--secondary' },
  { label: 'Text',             variable: '--text-primary' },
  { label: 'Text Muted',       variable: '--text-secondary' },
  { label: 'Surface',          variable: '--surface-base' },
  { label: 'Surface Raised',   variable: '--surface-raised' },
  { label: 'Surface Overlay',  variable: '--surface-overlay' },
  { label: 'White',            variable: '--color-white' },
  { label: 'Black',            variable: '--color-black' },
]

function resolveTokenColor(variable: string): string {
  if (typeof window === 'undefined') return '#888888'
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || '#888888'
}

interface Props {
  value: string | undefined
  onChange: (v: string) => void
}

export function ColorTokenField({ value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false)
  const customRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Determine if current value is a token or a custom hex
  const isToken = value?.startsWith('var(')
  const customHex = (!isToken && value) ? value : '#000000'

  const displayColor = (() => {
    if (!value) return 'transparent'
    if (isToken) {
      const varName = value.replace(/^var\((.+)\)$/, '$1')
      return mounted ? resolveTokenColor(varName) : '#888888'
    }
    return value
  })()

  return (
    <div className="space-y-2">
      {/* Token swatches */}
      <div className="flex flex-wrap gap-1.5">
        {TOKENS.map(({ label, variable }) => {
          const tokenValue = `var(${variable})`
          const isActive   = value === tokenValue
          const swatchColor = mounted ? resolveTokenColor(variable) : '#888888'

          return (
            <button
              key={variable}
              type="button"
              title={label}
              onClick={() => { onChange(tokenValue); setShowCustom(false) }}
              className={`group flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
                isActive
                  ? 'border-[var(--primary)] bg-[var(--primary)]/8'
                  : 'border-transparent hover:border-[var(--text-primary)]/20'
              }`}
            >
              <span
                className="w-7 h-7 rounded-md border border-[var(--text-primary)]/15 flex-shrink-0"
                style={{ backgroundColor: swatchColor }}
              />
              <span className={`text-[9px] font-medium leading-none truncate max-w-[36px] ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]/40 group-hover:text-[var(--text-primary)]/70'
              }`}>
                {label}
              </span>
            </button>
          )
        })}

        {/* Custom color chip */}
        <button
          type="button"
          title="Custom colour"
          onClick={() => setShowCustom((s) => !s)}
          className={`group flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
            !isToken && value
              ? 'border-[var(--primary)] bg-[var(--primary)]/8'
              : 'border-transparent hover:border-[var(--text-primary)]/20'
          }`}
        >
          <span
            className="w-7 h-7 rounded-md border border-[var(--text-primary)]/15 flex-shrink-0 overflow-hidden"
            style={{ background: !isToken && value ? displayColor : 'linear-gradient(135deg, #ff0000, #ff8800, #ffff00, #00ff00, #0000ff, #8800ff)' }}
          />
          <span className={`text-[9px] font-medium leading-none ${
            !isToken && value ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]/40 group-hover:text-[var(--text-primary)]/70'
          }`}>
            Custom
          </span>
        </button>
      </div>

      {/* Inline custom hex input */}
      {showCustom && (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-[var(--text-primary)]/10 bg-[var(--surface-overlay)]">
          <input
            ref={customRef}
            type="color"
            value={customHex}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0.5 bg-transparent flex-shrink-0"
          />
          <input
            type="text"
            value={!isToken && value ? value : customHex}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 text-xs bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[var(--text-primary)]/25 hover:text-red-400 transition-colors text-xs"
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Current value preview */}
      {value && (
        <p className="text-[10px] text-[var(--text-primary)]/30 font-mono truncate">{value}</p>
      )}
    </div>
  )
}
