'use client'

import { useRef, useState } from 'react'
import SeoModal from './seo-modal.component'
import BackupModal from './backup-modal.component'
import TranslationModal from './translation-modal.component'
import ShortcutsModal from './shortcuts-modal.component'
import { useEditorStore } from './stores/editorStore'
import type { PreviewMode } from './stores/editorStore'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMobileScreen, faTabletScreenButton, faDesktop, faRotateLeft, faRotateRight, faArrowUpRightFromSquare, faKeyboard } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const PREVIEW_MODES: { mode: PreviewMode; label: string; icon: IconDefinition }[] = [
  { mode: 'mobile', label: 'Mobile', icon: faMobileScreen },
  { mode: 'tablet', label: 'Tablet', icon: faTabletScreenButton },
  { mode: 'desktop', label: 'Desktop', icon: faDesktop },
]

interface Props {
  onSave: () => void
  onCancel: () => void
  previewUrl: string
}

// Inline editable text field
function InlineText({ value, onChange, placeholder, className = '' }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  if (editing) {
    return (
      <input
        ref={ref}
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false) }}
        placeholder={placeholder}
        className={`bg-transparent border-b border-[var(--primary)]/40 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 min-w-16 max-w-48 ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-text text-[var(--text-primary)] border-b border-transparent hover:border-[var(--text-primary)]/20 transition-colors truncate max-w-48 ${value ? '' : 'text-[var(--text-primary)]/30 italic'} ${className}`}
    >
      {value || placeholder}
    </span>
  )
}

export default function EditorTopBar({ onSave, onCancel, previewUrl }: Props) {
  const {
    title, setTitle,
    slug, setSlug,
    status, setStatus,
    saving, loading,
    setSeoOpen, setBackupOpen, setTranslationOpen,
    activeLang,
    translationCache,
    setTranslationTitle,
    setTranslationDescription,
    saveTranslation,
    previewMode, setPreviewMode,
    isDirty,
    undo, redo,
    undoStack, redoStack,
    setShowShortcuts,
  } = useEditorStore()

  const isTranslationMode = activeLang !== 'en'
  const translationEntry = isTranslationMode ? translationCache[activeLang] : null
  const activeLangLabel = activeLang.toUpperCase()

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[var(--surface-raised)] gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isTranslationMode ? (
            <>
              <InlineText
                value={translationEntry?.title ?? ''}
                onChange={(v) => setTranslationTitle(activeLang, v)}
                placeholder={`${activeLangLabel} Title`}
                className="font-bold text-sm"
              />
              <InlineText
                value={translationEntry?.description ?? ''}
                onChange={(v) => setTranslationDescription(activeLang, v)}
                placeholder={`${activeLangLabel} Description`}
                className="text-sm"
              />
              <span className="px-2 py-1 text-xs rounded bg-[var(--secondary)]/15 text-[var(--secondary)] border border-[var(--secondary)]/30 font-mono flex-shrink-0">
                {activeLangLabel} Translation
              </span>
            </>
          ) : (
            <>
              <InlineText
                value={title}
                onChange={setTitle}
                placeholder="Page Title"
                className="font-bold text-sm"
              />
              <span className="text-[var(--text-primary)]/30 flex-shrink-0">/</span>
              <InlineText
                value={slug}
                onChange={setSlug}
                placeholder="slug"
                className="text-sm font-mono"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED')}
                className="text-xs bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 rounded-md px-2 py-1.5 h-8 text-[var(--text-primary)] outline-none focus:border-[var(--primary)]/40 flex-shrink-0"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <button
                onClick={() => setSeoOpen(true)}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 bg-[var(--text-primary)]/10 text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] h-8"
              >
                SEO
              </button>
              <button
                onClick={() => setBackupOpen(true)}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 bg-[var(--text-primary)]/10 text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] h-8"
              >
                JSON
              </button>
            </>
          )}

          <button
            onClick={() => setTranslationOpen(true)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 h-8 flex items-center gap-1.5 ${
              isTranslationMode
                ? 'bg-[var(--secondary)]/15 text-[var(--secondary)] border border-[var(--secondary)]/30'
                : 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]/70 hover:text-[var(--text-primary)]'
            }`}
          >
            Translations
            {isTranslationMode && (
              <span className="font-mono font-bold">{activeLangLabel}</span>
            )}
          </button>
        </div>

        {/* Preview mode toggle */}
        <div className="flex items-center gap-0.5 bg-[var(--surface-overlay)] rounded-lg p-0.5 flex-shrink-0">
          {PREVIEW_MODES.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              title={label}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                previewMode === mode
                  ? 'bg-[var(--surface-base)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/70'
              }`}
            >
              <FontAwesomeIcon icon={icon} className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="w-8 h-8 flex items-center justify-center rounded-md text-xs text-[var(--text-primary)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
            className="w-8 h-8 flex items-center justify-center rounded-md text-xs text-[var(--text-primary)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            <FontAwesomeIcon icon={faRotateRight} className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isDirty && (
            <span className="text-[10px] text-yellow-500/70 font-medium">Unsaved</span>
          )}
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Preview page in new tab"
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 bg-[var(--text-primary)]/10 text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] h-8 flex items-center"
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 h-3 mr-1.5" />Preview
          </a>
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (Ctrl+/)"
            className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium bg-[var(--text-primary)]/10 text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
          >
            <FontAwesomeIcon icon={faKeyboard} className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 bg-[var(--text-primary)]/10 text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] h-8"
          >
            Cancel
          </button>
          <button
            onClick={isTranslationMode ? saveTranslation : onSave}
            disabled={saving || loading}
            className="px-5 py-1.5 rounded-md text-sm font-medium transition-all disabled:opacity-50 flex-shrink-0 bg-[var(--primary)] text-white h-8"
          >
            {saving ? 'Saving…' : isTranslationMode ? `Save ${activeLangLabel}` : 'Save'}
          </button>
        </div>
      </div>

      <SeoModal />
      <BackupModal />
      <TranslationModal />
      <ShortcutsModal />
    </>
  )
}
