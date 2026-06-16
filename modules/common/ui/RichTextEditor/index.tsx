'use client';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { cn } from '@nb/common/server/utils/cn';
import { Toolbar } from './toolbar.component';
import { PopupOverlays } from './popup-overlays.component';
import { sanitizePastedHTML } from './sanitize';
import { useQuillSetup } from './useQuillSetup';
import { useEditorActions } from './useEditorActions';
import { useTriggerKeyboard } from './useTriggerKeyboard';
import {
  createRichTextEditorStore,
  RichTextEditorStoreProvider,
  useRteStore,
  useRteStoreApi,
  type RichTextEditorStoreHook,
} from './store';
import type { QuillInstance, Range, RichTextEditorHandle, RichTextEditorProps } from './types';
import 'quill/dist/quill.snow.css';
import './quill.styles.css';

export type { RichTextEditorHandle, RichTextEditorProps, MentionUser, SlashCommand } from './types';

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(props, ref) {
  // Initial-only seed: subsequent `value` prop changes flow through the controlled-sync effect inside <Inner>.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createRichTextEditorStore(props.value ?? props.defaultValue ?? ''), []);
  return (
    <RichTextEditorStoreProvider store={store}>
      <Inner {...props} _store={store} ref={ref} />
    </RichTextEditorStoreProvider>
  );
});

type InnerProps = RichTextEditorProps & { _store: RichTextEditorStoreHook };

const Inner = forwardRef<RichTextEditorHandle, InnerProps>(function Inner({
  id, name, label, hint, error, value, defaultValue,
  onChange, onBlur, placeholder = 'Write something…', readOnly = false,
  minHeight = 180, maxLength, showCounter = false, showWordCount = false,
  onImageUpload, sanitizeOnPaste = true, autosaveKey,
  mentions, slashItems, className,
  _store,
}, ref) {
  const editorRef      = useRef<HTMLDivElement | null>(null);
  const toolbarRef     = useRef<HTMLDivElement | null>(null);
  const containerRef   = useRef<HTMLDivElement | null>(null);
  const quillRef       = useRef<QuillInstance | null>(null);
  const savedRangeRef  = useRef<Range | null>(null);
  const lastEmittedRef = useRef<string>('');
  const onChangeRef    = useRef(onChange);
  const onBlurRef      = useRef(onBlur);
  const onImageUploadRef = useRef(onImageUpload);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);
  useEffect(() => { onImageUploadRef.current = onImageUpload; }, [onImageUpload]);

  const api = useRteStoreApi();
  const html       = useRteStore((s) => s.html);
  const ready      = useRteStore((s) => s.ready);
  const chars      = useRteStore((s) => s.chars);
  const words      = useRteStore((s) => s.words);
  const htmlMode   = useRteStore((s) => s.htmlMode);
  const htmlSource = useRteStore((s) => s.htmlSource);
  const fullscreen = useRteStore((s) => s.fullscreen);

  useQuillSetup({
    editorRef, toolbarRef, quillRef, savedRangeRef, lastEmittedRef,
    onChangeRef, onBlurRef, onImageUploadRef,
    store: _store,
    readOnly, placeholder,
    initialHtml: defaultValue ?? value ?? '',
    sanitizeOnPaste, autosaveKey, maxLength, mentions, slashItems,
  });

  // Controlled `value` sync — external prop changes flow into Quill.
  useEffect(() => {
    const q = quillRef.current;
    if (!q || value === undefined || value === lastEmittedRef.current) return;
    const sel = q.getSelection();
    const safe = sanitizeOnPaste ? sanitizePastedHTML(value) : value;
    q.clipboard.dangerouslyPasteHTML(safe, 'silent');
    lastEmittedRef.current = q.root.innerHTML;
    api.getState().setHtml(q.root.innerHTML);
    if (sel) { try { q.setSelection(Math.min(sel.index, q.getLength() - 1), 0, 'silent'); } catch {} }
  }, [value, sanitizeOnPaste, api]);

  useEffect(() => { if (ready && quillRef.current) quillRef.current.enable(!readOnly); }, [ready, readOnly]);

  useImperativeHandle(ref, () => ({
    focus: () => quillRef.current?.focus(),
    blur:  () => quillRef.current?.blur(),
    clear: () => { quillRef.current?.setText('', 'user'); },
    getHTML: () => quillRef.current?.root.innerHTML ?? '',
    getText: () => quillRef.current?.getText() ?? '',
    setHTML: (h: string) => {
      const q = quillRef.current; if (!q) return;
      const safe = sanitizeOnPaste ? sanitizePastedHTML(h) : h;
      q.clipboard.dangerouslyPasteHTML(safe, 'silent');
      lastEmittedRef.current = q.root.innerHTML;
      api.getState().setHtml(q.root.innerHTML);
    },
    insertHTML: (h: string) => {
      const q = quillRef.current; if (!q) return;
      const range = q.getSelection(true) ?? { index: q.getLength(), length: 0 };
      const safe = sanitizeOnPaste ? sanitizePastedHTML(h) : h;
      if (q.clipboard.dangerouslyPasteHTMLAtIndex) q.clipboard.dangerouslyPasteHTMLAtIndex(range.index, safe, 'user');
      else q.clipboard.dangerouslyPasteHTML(safe, 'user');
    },
    getDelta: () => quillRef.current?.getContents(),
  }), [sanitizeOnPaste, api]);

  const actions = useEditorActions({ quillRef, savedRangeRef, onImageUploadRef, sanitizeOnPaste });
  const { filteredMentions, filteredSlash, acceptMention, acceptSlash } =
    useTriggerKeyboard({ quillRef, mentions, slashItems });

  /* Click-anywhere focus — clicking padding / empty space inside the
     bordered container focuses the editor at end-of-content. */
  const handleWrapperMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || htmlMode) return;
    const target = e.target as HTMLElement;
    if (!target) return;
    if (target.closest('.ql-editor')) return;
    if (target.closest('.ql-toolbar')) return;
    if (target.closest('.kui-rte-counter')) return;
    if (target.closest('button')) return;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    const q = quillRef.current; if (!q) return;
    q.focus();
    try { const len = q.getLength(); q.setSelection(Math.max(0, len - 1), 0, 'user'); } catch {}
  }, [readOnly, htmlMode]);

  const describedBy = [
    hint && !error ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(' ') || undefined;

  const overLimit = !!maxLength && chars > maxLength;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (<label htmlFor={id} className="text-sm font-medium text-text-primary">{label}</label>)}

      <div
        ref={containerRef}
        id={id}
        data-kui-rte
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        onMouseDown={handleWrapperMouseDown}
        className={cn(
          'rounded-md border border-border bg-surface-base overflow-hidden',
          'focus-within:ring-2 focus-within:ring-border-focus',
          error && 'border-error',
          readOnly && 'bg-surface-sunken',
          fullscreen && 'fixed inset-0 z-[60] rounded-none border-0 flex flex-col',
        )}
      >
        <Toolbar
          ref={toolbarRef}
          readOnly={readOnly}
          fullscreen={fullscreen}
          onUndo={actions.onUndo}
          onRedo={actions.onRedo}
          onInsertTable={actions.onInsertTable}
          onInsertHR={actions.onInsertHR}
          onToggleFullscreen={actions.onToggleFullscreen}
          onToggleHtmlMode={actions.onToggleHtmlMode}
          onApplyFormat={actions.applyFormat}
        />

        <div className={cn('relative', fullscreen && 'flex-1 min-h-0 flex flex-col')}>
          {!ready && (
            <div className="absolute inset-0 flex flex-col gap-2 p-4 bg-surface-base" aria-hidden="true">
              <span className="h-3 w-1/3 rounded bg-surface-sunken animate-pulse" />
              <span className="h-3 w-2/3 rounded bg-surface-sunken animate-pulse" />
              <span className="h-3 w-1/2 rounded bg-surface-sunken animate-pulse" />
            </div>
          )}
          <textarea
            value={htmlSource}
            onChange={(e) => api.getState().setHtmlSource(e.target.value)}
            spellCheck={false}
            aria-label="HTML source"
            className={cn(
              'block w-full font-mono text-xs leading-relaxed p-3 bg-surface-base text-text-primary outline-none resize-none focus-visible:outline-none',
              !htmlMode && 'hidden',
              fullscreen && 'flex-1 min-h-0',
            )}
            style={fullscreen ? undefined : { minHeight }}
          />
          <div
            ref={editorRef}
            className={cn('kui-rte-content', htmlMode && 'hidden', fullscreen && 'flex-1 min-h-0 overflow-auto')}
            style={fullscreen ? undefined : { minHeight }}
          />
        </div>

        {(showCounter || showWordCount || maxLength) && (
          <div className={cn(
            'kui-rte-counter flex items-center justify-end gap-3 px-3 py-1.5 border-t border-border bg-surface-overlay text-xs text-text-secondary',
            fullscreen && 'shrink-0',
          )}>
            {showWordCount && <span>{words} {words === 1 ? 'word' : 'words'}</span>}
            {(showCounter || maxLength) && (
              <span className={cn(overLimit && 'text-error font-medium')}>
                {chars}{maxLength ? ` / ${maxLength}` : ''}{overLimit ? ' (over limit)' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {name && <input type="hidden" name={name} value={html} />}
      {hint && !error && (<p id={`${id}-hint`} className="text-xs text-text-secondary">{hint}</p>)}
      {error && (<p id={`${id}-error`} className="text-xs text-error" role="alert">{error}</p>)}

      <PopupOverlays
        readOnly={readOnly}
        filteredMentions={filteredMentions}
        filteredSlash={filteredSlash}
        onAcceptMention={acceptMention}
        onAcceptSlash={acceptSlash}
        onInsertImage={actions.handleInsertImage}
        onInsertTable={actions.insertTable}
        onInsertEmoji={actions.insertEmoji}
        onApplyFormat={actions.applyFormat}
        onResizeImage={actions.applyImageResize}
        onAlignImage={actions.applyImageAlign}
        onRemoveImage={actions.removeSelectedImage}
      />
    </div>
  );
});
