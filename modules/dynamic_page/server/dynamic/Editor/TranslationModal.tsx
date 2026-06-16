'use client'

import { useState } from 'react'
import { Modal } from '@nb/common/ui/Modal'
import { useEditorStore } from './stores/editorStore'

const LANG_NAMES: Record<string, string> = {
  tr: 'Turkish', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian',
  pt: 'Portuguese', ru: 'Russian', ar: 'Arabic', zh: 'Chinese', ja: 'Japanese',
  ko: 'Korean', nl: 'Dutch', pl: 'Polish', sv: 'Swedish', no: 'Norwegian',
  da: 'Danish', fi: 'Finnish', cs: 'Czech', hu: 'Hungarian', ro: 'Romanian',
}

const ALL_LANGS = Object.keys(LANG_NAMES)

export default function TranslationModal() {
  const {
    translationOpen, setTranslationOpen,
    activeLang, savedLangs, translationCache,
    setActiveLang, deleteTranslation, pageId,
  } = useEditorStore()

  const [newLang, setNewLang] = useState('')

  const addedLangs = Object.keys(translationCache).filter((l) => l !== 'en')
  const availableToAdd = ALL_LANGS.filter((l) => !addedLangs.includes(l))

  const handleSelect = (lang: string) => {
    setActiveLang(lang)
    setTranslationOpen(false)
  }

  const handleAdd = () => {
    if (!newLang) return
    setActiveLang(newLang)
    setNewLang('')
    setTranslationOpen(false)
  }

  if (!pageId) return null

  return (
    <Modal
      open={translationOpen}
      onClose={() => setTranslationOpen(false)}
      title="Translations"
      size="sm"
    >
      <div className="flex flex-col gap-4 p-1">
        {/* Progress */}
        <div className="flex items-center justify-between text-xs text-[var(--text-primary)]/40">
          <span>{savedLangs.length} translation(s) saved</span>
        </div>

        {/* Language pills */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSelect('en')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all select-none ${
              activeLang === 'en'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'bg-green-500/15 text-green-500 border border-green-500/30 hover:bg-green-500/25'
            }`}
          >
            <span className="font-mono tracking-wider">EN</span>
            <span className={`text-[9px] font-bold tracking-widest px-1 py-0.5 rounded ${
              activeLang === 'en' ? 'bg-white/20 text-white' : 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]/40'
            }`}>SRC</span>
          </button>

          {addedLangs.map((lang) => {
            const isActive = activeLang === lang
            const isSaved = savedLangs.includes(lang)
            return (
              <div key={lang} className="relative group">
                <button
                  type="button"
                  onClick={() => handleSelect(lang)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all select-none ${
                    isActive
                      ? 'bg-[var(--primary)] text-white shadow-md'
                      : isSaved
                        ? 'bg-green-500/15 text-green-500 border border-green-500/30 hover:bg-green-500/25'
                        : 'bg-[var(--text-primary)]/5 text-[var(--text-primary)]/60 border border-[var(--text-primary)]/10 hover:bg-[var(--text-primary)]/10'
                  }`}
                >
                  <span className="font-mono tracking-wider">{lang.toUpperCase()}</span>
                  {isSaved && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-500/70" />}
                </button>
                <button
                  type="button"
                  title={`Remove ${LANG_NAMES[lang] ?? lang}`}
                  onClick={() => deleteTranslation(lang)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold hidden group-hover:flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>

        {/* Add language */}
        {availableToAdd.length > 0 && (
          <div className="flex gap-2">
            <select
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md text-sm text-[var(--text-primary)] outline-none bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 focus:border-[var(--primary)]/40 transition-colors"
            >
              <option value="">+ Add language…</option>
              {availableToAdd.map((l) => (
                <option key={l} value={l}>{LANG_NAMES[l] ?? l} ({l.toUpperCase()})</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!newLang}
              className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--primary)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
