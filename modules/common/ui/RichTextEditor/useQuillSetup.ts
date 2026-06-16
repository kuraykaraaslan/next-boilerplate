'use client';
import { useEffect, type MutableRefObject } from 'react';
import type { MentionUser, QuillInstance, Range, SlashCommand } from './types';
import type { RichTextEditorStoreHook } from './store';
import { applyMarkdownShortcuts } from './markdown';
import { resolveImageSrc, sanitizePastedHTML } from './sanitize';
import { detectTriggers, updateCounts } from './quill-helpers';

export type UseQuillSetupOptions = {
  editorRef: MutableRefObject<HTMLDivElement | null>;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  quillRef: MutableRefObject<QuillInstance | null>;
  savedRangeRef: MutableRefObject<Range | null>;
  lastEmittedRef: MutableRefObject<string>;
  onChangeRef: MutableRefObject<((html: string, delta?: unknown) => void) | undefined>;
  onBlurRef: MutableRefObject<((html: string) => void) | undefined>;
  onImageUploadRef: MutableRefObject<((file: File) => Promise<string>) | undefined>;
  store: RichTextEditorStoreHook;
  readOnly: boolean;
  placeholder: string;
  initialHtml: string;
  sanitizeOnPaste: boolean;
  autosaveKey: string | undefined;
  maxLength: number | undefined;
  mentions: MentionUser[] | undefined;
  slashItems: SlashCommand[] | undefined;
};

/**
 * Mounts a Quill instance against `editorRef`, wires its toolbar to
 * `toolbarRef`, and listens for text/selection/editor changes. State
 * updates flow through the Zustand store hook on `opts.store`.
 *
 * Returns nothing — Quill writes to `quillRef.current`. Cleanup
 * detaches listeners and clears the ref on unmount.
 */
export function useQuillSetup(opts: UseQuillSetupOptions) {
  const {
    editorRef, toolbarRef, quillRef, savedRangeRef, lastEmittedRef,
    onChangeRef, onBlurRef, onImageUploadRef,
    store, readOnly, placeholder, initialHtml, sanitizeOnPaste,
    autosaveKey, maxLength, mentions, slashItems,
  } = opts;

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const handlers: { event: string; handler: (...args: unknown[]) => void }[] = [];
    let cleanupDom: (() => void) | undefined;

    import('quill').then((mod) => {
      if (cancelled || !editorRef.current || !toolbarRef.current || quillRef.current) return;
      const Quill = mod.default as unknown as (new (el: HTMLElement, opts: unknown) => QuillInstance) & {
        import: (path: string) => { whitelist: string[] };
        register: (fmt: unknown, suppressWarning?: boolean) => void;
      };

      // Re-register `size` attributor with numeric px whitelist so the
      // toolbar dropdown shows specific point sizes instead of keywords.
      try {
        const Size = Quill.import('attributors/style/size');
        Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'];
        Quill.register(Size, true);
      } catch {}

      const q = new Quill(editorRef.current, {
        theme: 'snow',
        readOnly,
        placeholder,
        modules: {
          toolbar: {
            container: toolbarRef.current,
            handlers: {
              image: () => {
                savedRangeRef.current = q.getSelection(true);
                store.getState().openImg();
              },
            },
          },
          history: { delay: 100, maxStack: 200, userOnly: true },
          keyboard: {
            bindings: {
              tabIndent:  { key: 9,                handler(range: Range) { q.formatLine(range.index, 0, 'indent', '+1', 'user'); return false; } },
              tabOutdent: { key: 9, shiftKey: true, handler(range: Range) { q.formatLine(range.index, 0, 'indent', '-1', 'user'); return false; } },
            },
          },
        },
      });
      quillRef.current = q;

      // Restore autosave / defaultValue / value
      let restoredInitial = '';
      if (autosaveKey && typeof window !== 'undefined') {
        try { restoredInitial = window.localStorage.getItem('kui-rte:' + autosaveKey) ?? ''; } catch {}
      }
      if (!restoredInitial) restoredInitial = initialHtml;
      if (restoredInitial) {
        const safe = sanitizeOnPaste ? sanitizePastedHTML(restoredInitial) : restoredInitial;
        q.clipboard.dangerouslyPasteHTML(safe, 'silent');
      }
      lastEmittedRef.current = q.root.innerHTML;
      updateCounts(q, store);

      const emit = () => {
        const next = q.root.innerHTML;
        lastEmittedRef.current = next;
        store.getState().setHtml(next);
        onChangeRef.current?.(next, q.getContents());
        if (autosaveKey && typeof window !== 'undefined') {
          try { window.localStorage.setItem('kui-rte:' + autosaveKey, next); } catch {}
        }
        updateCounts(q, store);
      };

      const enforceMaxLength = () => {
        if (!maxLength) return;
        const text = q.getText().replace(/\n+$/, '');
        if (text.length <= maxLength) return;
        const excess = text.length - maxLength;
        q.deleteText(q.getLength() - excess - 1, excess, 'silent');
      };

      const onTextChange = () => {
        clearTimeout(debounceTimer);
        applyMarkdownShortcuts(q);
        enforceMaxLength();
        debounceTimer = setTimeout(emit, 120);
      };

      const onSelectionChange = ((range: Range | null) => {
        if (range) {
          try { store.getState().setActive(q.getFormat(range)); } catch {}
        }
        if (range && range.length > 0) {
          const bounds = q.getBounds(range.index, range.length);
          const root = q.container.getBoundingClientRect();
          store.getState().setBubble({
            open: true,
            position: {
              top:  Math.max(8, root.top + bounds.top - 40),
              left: root.left + bounds.left + bounds.width / 2 - 90,
            },
          });
        } else {
          const cur = store.getState().bubble;
          if (cur.open) store.getState().setBubble({ open: false, position: null });
        }
        if (!range) {
          const st = store.getState();
          if (st.mention.open) st.setMention((s) => ({ ...s, open: false }));
          if (st.slash.open)   st.setSlash((s) => ({ ...s, open: false }));
        }
      }) as unknown as (...args: unknown[]) => void;

      const onEditorChange = () => {
        const sel = q.getSelection();
        const st = store.getState();
        if (!sel || sel.length > 0) {
          if (st.mention.open) st.setMention((s) => ({ ...s, open: false }));
          if (st.slash.open)   st.setSlash((s) => ({ ...s, open: false }));
          return;
        }
        detectTriggers(q, sel.index, mentions, slashItems, store);
      };

      q.on('text-change', onTextChange);
      q.on('selection-change', onSelectionChange);
      q.on('editor-change', onEditorChange);
      handlers.push({ event: 'text-change',      handler: onTextChange      as unknown as () => void });
      handlers.push({ event: 'selection-change', handler: onSelectionChange as unknown as () => void });
      handlers.push({ event: 'editor-change',    handler: onEditorChange    as unknown as () => void });

      // DOM-level events
      const onBlurDom = () => { onBlurRef.current?.(q.root.innerHTML); };
      q.root.addEventListener('blur', onBlurDom);

      const onDrop = async (e: DragEvent) => {
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;
        const img = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (!img) return;
        e.preventDefault();
        e.stopPropagation();
        const src = await resolveImageSrc(img, onImageUploadRef.current);
        const range = q.getSelection(true) ?? { index: q.getLength(), length: 0 };
        q.insertEmbed(range.index, 'image', src, 'user');
        q.setSelection(range.index + 1, 0, 'user');
      };
      const onDragOver = (e: DragEvent) => {
        if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
      };
      q.root.addEventListener('drop', onDrop);
      q.root.addEventListener('dragover', onDragOver);

      const onPaste = (ev: ClipboardEvent) => {
        if (!sanitizeOnPaste) return;
        const data = ev.clipboardData;
        if (!data) return;
        const htmlData = data.getData('text/html');
        if (!htmlData) return;
        ev.preventDefault();
        const safe = sanitizePastedHTML(htmlData);
        const range = q.getSelection(true) ?? { index: q.getLength(), length: 0 };
        if (q.clipboard.dangerouslyPasteHTMLAtIndex) {
          q.clipboard.dangerouslyPasteHTMLAtIndex(range.index, safe, 'user');
        } else {
          const tmp = document.createElement('div');
          tmp.innerHTML = safe;
          q.insertText(range.index, tmp.textContent ?? '', 'user');
        }
      };
      q.root.addEventListener('paste', onPaste);

      const onClick = (e: MouseEvent) => {
        const t = e.target as HTMLElement;
        if (t.tagName === 'IMG') {
          const img = t as HTMLImageElement;
          store.getState().setImgSel({ open: true, el: img, rect: img.getBoundingClientRect() });
        } else if (store.getState().imgSel.open) {
          store.getState().setImgSel({ open: false, el: null, rect: null });
        }
      };
      q.root.addEventListener('click', onClick);

      cleanupDom = () => {
        q.root.removeEventListener('drop', onDrop);
        q.root.removeEventListener('dragover', onDragOver);
        q.root.removeEventListener('blur', onBlurDom);
        q.root.removeEventListener('paste', onPaste);
        q.root.removeEventListener('click', onClick);
      };

      store.getState().setReady(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      cleanupDom?.();
      const q = quillRef.current;
      if (q) handlers.forEach(({ event, handler }) => q.off(event, handler));
      quillRef.current = null;
    };
    // mount-only — subsequent prop updates use dedicated effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

