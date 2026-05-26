'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/modules_next/common/utils/cn';
import { ImageInsertModal } from './ImageInsertModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold, faItalic, faUnderline, faStrikethrough, faCode,
  faListUl, faListOl, faLink, faImage,
  faAlignLeft, faAlignCenter, faAlignRight,
  faRemoveFormat, faRotateLeft, faRotateRight,
  faQuoteRight, faCodeBranch,
} from '@fortawesome/free-solid-svg-icons';
import 'quill/dist/quill.snow.css';
import './quill.styles.css';

export type RichTextEditorProps = {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  className?: string;
};

type QuillInstance = {
  getSelection: (focus?: boolean) => { index: number; length: number } | null;
  setSelection: (index: number, length: number, source?: string) => void;
  getLength: () => number;
  insertEmbed: (index: number, type: string, value: unknown, source?: string) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  enable: (enabled: boolean) => void;
  root: HTMLDivElement;
  history: { undo: () => void; redo: () => void };
  clipboard: { dangerouslyPasteHTML: (html: string, source?: string) => void };
};

const TB_BTN = 'kui-rte-btn inline-flex items-center justify-center w-7 h-7 rounded text-text-primary hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus transition-colors';
const TB_DIVIDER = 'w-px h-5 bg-border mx-1 self-center';

export function RichTextEditor({
  id,
  label,
  hint,
  error,
  value,
  defaultValue,
  onChange,
  placeholder = 'Write something…',
  readOnly = false,
  minHeight = 180,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<QuillInstance | null>(null);
  const savedRange = useRef<{ index: number; length: number } | null>(null);
  const onChangeRef = useRef(onChange);
  const [imgOpen, setImgOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    import('quill').then(({ default: Quill }) => {
      if (cancelled || !editorRef.current || !toolbarRef.current || quillRef.current) return;

      const q = new Quill(editorRef.current, {
        theme: 'snow',
        readOnly,
        placeholder,
        modules: {
          toolbar: {
            container: toolbarRef.current,
            handlers: {
              image: function () {
                savedRange.current = q.getSelection(true);
                setImgOpen(true);
              },
            },
          },
          history: { delay: 100, maxStack: 200, userOnly: true },
        },
      }) as unknown as QuillInstance;
      quillRef.current = q;

      const initial = defaultValue ?? value ?? '';
      if (initial) q.clipboard.dangerouslyPasteHTML(initial, 'silent');

      const handleTextChange = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          onChangeRef.current?.(q.root.innerHTML);
        }, 150);
      };
      q.on('text-change', handleTextChange);

      setReady(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready && quillRef.current) quillRef.current.enable(!readOnly);
  }, [ready, readOnly]);

  useEffect(() => {
    const q = quillRef.current;
    if (!ready || !q) return;
    if (value !== undefined && value !== q.root.innerHTML) {
      q.clipboard.dangerouslyPasteHTML(value || '', 'silent');
    }
  }, [ready, value]);

  function handleInsertImage({ src, alt }: { src: string; alt: string }) {
    const q = quillRef.current;
    if (!q || !src) { setImgOpen(false); return; }
    const range = savedRange.current ?? { index: q.getLength(), length: 0 };
    q.insertEmbed(range.index, 'image', src, 'user');
    const imgs = q.root.querySelectorAll('img');
    const last = imgs[imgs.length - 1];
    if (last && alt) last.setAttribute('alt', alt);
    q.setSelection(range.index + 1, 0, 'user');
    setImgOpen(false);
    onChangeRef.current?.(q.root.innerHTML);
  }

  const describedBy = [
    hint && !error ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}

      <div
        id={id}
        data-kui-rte
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          'rounded-md border border-border bg-surface-base overflow-hidden',
          'focus-within:ring-2 focus-within:ring-border-focus',
          error && 'border-error',
          readOnly && 'bg-surface-sunken'
        )}
      >
        <div
          ref={toolbarRef}
          className={cn('ql-toolbar ql-snow flex flex-wrap items-center gap-0.5', readOnly && 'hidden')}
        >
          <select className="ql-header" defaultValue="" aria-label="Heading level">
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="">Paragraph</option>
          </select>
          <button type="button" className={cn(TB_BTN, 'ql-blockquote')} aria-label="Blockquote">
            <FontAwesomeIcon icon={faQuoteRight} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={cn(TB_BTN, 'ql-code-block')} aria-label="Code block">
            <FontAwesomeIcon icon={faCodeBranch} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>

          <span className={TB_DIVIDER} aria-hidden="true" />

          <button type="button" className={cn(TB_BTN, 'ql-bold')} aria-label="Bold">
            <FontAwesomeIcon icon={faBold} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={cn(TB_BTN, 'ql-italic')} aria-label="Italic">
            <FontAwesomeIcon icon={faItalic} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={cn(TB_BTN, 'ql-underline')} aria-label="Underline">
            <FontAwesomeIcon icon={faUnderline} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={cn(TB_BTN, 'ql-strike')} aria-label="Strikethrough">
            <FontAwesomeIcon icon={faStrikethrough} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={cn(TB_BTN, 'ql-code')} aria-label="Inline code">
            <FontAwesomeIcon icon={faCode} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>

          <span className={TB_DIVIDER} aria-hidden="true" />

          <button type="button" className={cn(TB_BTN, 'ql-list')} value="bullet" aria-label="Bullet list">
            <FontAwesomeIcon icon={faListUl} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={cn(TB_BTN, 'ql-list')} value="ordered" aria-label="Numbered list">
            <FontAwesomeIcon icon={faListOl} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>

          <span className={TB_DIVIDER} aria-hidden="true" />

          <button type="button" className={cn(TB_BTN, 'ql-link')} aria-label="Insert link">
            <FontAwesomeIcon icon={faLink} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={cn(TB_BTN, 'ql-image')} aria-label="Insert image">
            <FontAwesomeIcon icon={faImage} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>

          <span className={TB_DIVIDER} aria-hidden="true" />

          <button type="button" className={cn(TB_BTN, 'ql-align')} value="" aria-label="Align left">
            <FontAwesomeIcon icon={faAlignLeft} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={cn(TB_BTN, 'ql-align')} value="center" aria-label="Align center">
            <FontAwesomeIcon icon={faAlignCenter} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={cn(TB_BTN, 'ql-align')} value="right" aria-label="Align right">
            <FontAwesomeIcon icon={faAlignRight} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>

          <span className={TB_DIVIDER} aria-hidden="true" />

          <button type="button" className={cn(TB_BTN, 'ql-clean')} aria-label="Clear formatting">
            <FontAwesomeIcon icon={faRemoveFormat} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>

          <span className={TB_DIVIDER} aria-hidden="true" />

          <button
            type="button"
            className={TB_BTN}
            aria-label="Undo"
            onClick={() => quillRef.current?.history.undo()}
          >
            <FontAwesomeIcon icon={faRotateLeft} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className={TB_BTN}
            aria-label="Redo"
            onClick={() => quillRef.current?.history.redo()}
          >
            <FontAwesomeIcon icon={faRotateRight} aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          ref={editorRef}
          className="kui-rte-content"
          style={{ minHeight }}
        />
      </div>

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-text-secondary">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-error" role="alert">{error}</p>
      )}

      <ImageInsertModal
        open={imgOpen}
        onClose={() => setImgOpen(false)}
        onInsert={handleInsertImage}
      />
    </div>
  );
}
