'use client'

import { Modal } from '@nb/common/ui/modal.component'
import { toast } from '@nb/common/ui/toast.store'
import { useEditorStore } from './stores/editorStore'
import { CURRENT_SCHEMA_VERSION } from '@nb/dynamic_page/server/dynamic_page.types'

export default function BackupModal() {
  const {
    backupOpen, setBackupOpen,
    title, slug, status, description, keywords, seoData, sections,
    translationCache,
  } = useEditorStore()

  const getBackupData = () => ({
    title, slug, status, description, keywords, seoData,
    sections: sections.map((s, i) => ({ ...s, order: i })),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    translations: Object.keys(translationCache).length > 0 ? translationCache : undefined,
  })

  const handleExport = () => {
    const json = JSON.stringify(getBackupData(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `page-backup-${slug || 'untitled'}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup downloaded')
  }

  return (
    <Modal
      open={backupOpen}
      onClose={() => setBackupOpen(false)}
      title="JSON Backup"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setBackupOpen(false)}
            className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--text-primary)]/10 text-[var(--text-primary)]/70"
          >
            Close
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--primary)] text-white"
          >
            Export JSON
          </button>
        </div>
      }
    >
      <div className="space-y-5 p-1">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]/60 uppercase tracking-wide">Current Page JSON</h3>
          <textarea
            readOnly
            value={JSON.stringify(getBackupData(), null, 2)}
            rows={14}
            className="w-full font-mono text-xs resize-none p-3 rounded-md border border-[var(--text-primary)]/10 bg-[var(--surface-overlay)] text-[var(--text-primary)] outline-none"
          />
        </section>
      </div>
    </Modal>
  )
}
