'use client';
import { useCallback, type MutableRefObject } from 'react';
import { sanitizePastedHTML } from './sanitize';
import { useRteStoreApi } from './store';
import type { QuillInstance, Range } from './types';

export type UseEditorActionsArgs = {
  quillRef: MutableRefObject<QuillInstance | null>;
  savedRangeRef: MutableRefObject<Range | null>;
  onImageUploadRef: MutableRefObject<((file: File) => Promise<string>) | undefined>;
  sanitizeOnPaste: boolean;
};

/**
 * Bundles every toolbar / modal / overlay callback the editor exposes.
 * Callbacks all read live Zustand state via the store API so they
 * remain stable references.
 */
export function useEditorActions({
  quillRef, savedRangeRef, onImageUploadRef, sanitizeOnPaste,
}: UseEditorActionsArgs) {
  const api = useRteStoreApi();

  const applyFormat = useCallback((name: string, val: unknown) => {
    const q = quillRef.current; if (!q) return;
    q.format(name, val, 'user');
    try { api.getState().setActive(q.getFormat()); } catch {}
  }, [api, quillRef]);

  const onUndo = useCallback(() => quillRef.current?.history.undo(), [quillRef]);
  const onRedo = useCallback(() => quillRef.current?.history.redo(), [quillRef]);
  const onInsertTable = useCallback(() => api.getState().openTable(), [api]);

  const onInsertHR = useCallback(() => {
    const q = quillRef.current; if (!q) return;
    const range = q.getSelection(true) ?? { index: q.getLength(), length: 0 };
    q.clipboard.dangerouslyPasteHTML(
      range.index >= q.getLength() ? '<hr/><p><br></p>' : '<hr/>',
      'user',
    );
  }, [quillRef]);

  const onToggleFullscreen = useCallback(() => api.getState().setFullscreen((v) => !v), [api]);

  const onToggleHtmlMode = useCallback(() => {
    const q = quillRef.current; if (!q) return;
    const s = api.getState();
    if (!s.htmlMode) {
      s.setHtmlSource(q.root.innerHTML);
      s.setHtmlMode(true);
    } else {
      const safe = sanitizeOnPaste ? sanitizePastedHTML(s.htmlSource) : s.htmlSource;
      q.setText('', 'silent');
      q.clipboard.dangerouslyPasteHTML(safe, 'user');
      s.setHtmlMode(false);
    }
  }, [api, sanitizeOnPaste, quillRef]);

  const handleInsertImage = useCallback(async ({ src, alt, file }: { src: string; alt: string; file?: File | null }) => {
    const q = quillRef.current;
    if (!q) { api.getState().closeImg(); return; }
    let finalSrc = src;
    if (file && onImageUploadRef.current) {
      try { finalSrc = await onImageUploadRef.current(file); } catch {}
    }
    if (!finalSrc) { api.getState().closeImg(); return; }
    const range = savedRangeRef.current ?? { index: q.getLength(), length: 0 };
    q.insertEmbed(range.index, 'image', finalSrc, 'user');
    const imgs = q.root.querySelectorAll('img');
    const last = imgs[imgs.length - 1] as HTMLImageElement | undefined;
    if (last && alt) last.setAttribute('alt', alt);
    q.setSelection(range.index + 1, 0, 'user');
    api.getState().closeImg();
  }, [api, quillRef, savedRangeRef, onImageUploadRef]);

  const insertTable = useCallback((rows: number, cols: number) => {
    const q = quillRef.current;
    if (!q) { api.getState().closeTable(); return; }
    const head = '<tr>' + Array.from({ length: cols }).map(() => '<th>&nbsp;</th>').join('') + '</tr>';
    const body = Array.from({ length: rows - 1 }).map(() =>
      '<tr>' + Array.from({ length: cols }).map(() => '<td>&nbsp;</td>').join('') + '</tr>'
    ).join('');
    const tableHtml = '<table class="kui-rte-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table><p><br></p>';
    const range = q.getSelection(true) ?? { index: q.getLength(), length: 0 };
    if (q.clipboard.dangerouslyPasteHTMLAtIndex) q.clipboard.dangerouslyPasteHTMLAtIndex(range.index, tableHtml, 'user');
    else q.clipboard.dangerouslyPasteHTML(tableHtml, 'user');
    api.getState().closeTable();
  }, [api, quillRef]);

  const insertEmoji = useCallback((emoji: string) => {
    const q = quillRef.current; if (!q) return;
    const range = q.getSelection(true) ?? { index: q.getLength(), length: 0 };
    q.insertText(range.index, emoji, 'user');
    q.setSelection(range.index + emoji.length, 0, 'user');
  }, [quillRef]);

  const applyImageResize = useCallback((width: string) => {
    const sel = api.getState().imgSel;
    if (!sel.el) return;
    sel.el.setAttribute('style', `width:${width};max-width:100%;height:auto;`);
    api.getState().setImgSel({ ...sel, rect: sel.el.getBoundingClientRect() });
  }, [api]);

  const applyImageAlign = useCallback((align: 'left' | 'center' | 'right') => {
    const sel = api.getState().imgSel;
    if (!sel.el) return;
    sel.el.setAttribute('data-align', align);
    const display = align === 'center' ? 'block' : 'inline-block';
    const margin  = align === 'center' ? '0.5em auto' : align === 'right' ? '0.5em 0 0.5em auto' : '0.5em auto 0.5em 0';
    const cur = sel.el.getAttribute('style') ?? '';
    const cleaned = cur.replace(/(display|margin|float)\s*:[^;]+;?/g, '');
    sel.el.setAttribute('style', `${cleaned}display:${display};margin:${margin};`);
    api.getState().setImgSel({ ...sel, rect: sel.el.getBoundingClientRect() });
  }, [api]);

  const removeSelectedImage = useCallback(() => {
    const sel = api.getState().imgSel;
    if (!sel.el) return;
    sel.el.parentNode?.removeChild(sel.el);
    api.getState().setImgSel({ open: false, el: null, rect: null });
  }, [api]);

  return {
    applyFormat,
    onUndo, onRedo, onInsertTable, onInsertHR, onToggleFullscreen, onToggleHtmlMode,
    handleInsertImage, insertTable, insertEmoji,
    applyImageResize, applyImageAlign, removeSelectedImage,
  };
}
