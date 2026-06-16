'use client';
import { forwardRef } from 'react';
import { cn } from '@nb/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold, faItalic, faUnderline, faStrikethrough, faCode,
  faListUl, faListOl, faLink, faImage,
  faAlignLeft, faAlignCenter, faAlignRight,
  faRemoveFormat, faRotateLeft, faRotateRight,
  faQuoteRight, faCodeBranch,
  faSuperscript, faSubscript,
  faIndent, faOutdent, faMinus, faTable,
  faFaceSmile, faExpand, faCompress, faFileCode,
  faPalette, faHighlighter,
} from '@fortawesome/free-solid-svg-icons';
import { ColorPicker } from '@nb/common/ui/ColorPicker';
import { useRteStore } from './store';
import type { QuillInstance } from './types';

const TB_BTN = 'kui-rte-btn inline-flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded text-text-primary hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus transition-colors';
const TB_DIVIDER = 'w-px h-5 bg-border mx-1 self-center';

export type ToolbarProps = {
  readOnly: boolean;
  fullscreen: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onInsertTable: () => void;
  onInsertHR: () => void;
  onToggleFullscreen: () => void;
  onToggleHtmlMode: () => void;
  onApplyFormat: (name: string, value: unknown) => void;
};

/**
 * Toolbar markup. The `<div>` ref must be assigned to Quill's
 * `toolbar.container` option so Quill wires the .ql-* buttons.
 * Stand-alone buttons (undo/redo/fullscreen/...) are handled
 * through the props.
 */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar({
  readOnly,
  fullscreen,
  onUndo,
  onRedo,
  onInsertTable,
  onInsertHR,
  onToggleFullscreen,
  onToggleHtmlMode,
  onApplyFormat,
}, ref) {
  const htmlMode    = useRteStore((s) => s.htmlMode);
  const textColor   = useRteStore((s) => s.textColor);
  const bgColor     = useRteStore((s) => s.bgColor);
  const setTextCol  = useRteStore((s) => s.setTextColor);
  const setBgCol    = useRteStore((s) => s.setBgColor);
  const openEmoji   = useRteStore((s) => s.openEmoji);

  return (
    <div
      ref={ref}
      className={cn(
        'ql-toolbar ql-snow flex flex-wrap items-center gap-0.5',
        readOnly && 'hidden',
        fullscreen && 'shrink-0'
      )}
    >
      <select className="ql-header" defaultValue="" aria-label="Heading level" title="Heading">
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
        <option value="">Paragraph</option>
      </select>
      <select className="ql-font" defaultValue="" aria-label="Font" title="Font family">
        <option value="">Sans</option>
        <option value="serif">Serif</option>
        <option value="monospace">Mono</option>
      </select>
      <select className="ql-size" defaultValue="" aria-label="Size" title="Font size">
        <option value="10px">10</option>
        <option value="12px">12</option>
        <option value="">14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="20px">20</option>
        <option value="24px">24</option>
        <option value="32px">32</option>
      </select>
      <button type="button" className={cn(TB_BTN, 'ql-blockquote')} title="Blockquote" aria-label="Blockquote">
        <FontAwesomeIcon icon={faQuoteRight} aria-hidden="true" className="w-3.5 h-3.5" />
      </button>
      <button type="button" className={cn(TB_BTN, 'ql-code-block')} title="Code block" aria-label="Code block">
        <FontAwesomeIcon icon={faCodeBranch} aria-hidden="true" className="w-3.5 h-3.5" />
      </button>

      <span className={TB_DIVIDER} aria-hidden="true" />

      <button type="button" className={cn(TB_BTN, 'ql-bold')}      title="Bold (Ctrl+B)"      aria-label="Bold">      <FontAwesomeIcon icon={faBold}          aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-italic')}    title="Italic (Ctrl+I)"    aria-label="Italic">    <FontAwesomeIcon icon={faItalic}        aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-underline')} title="Underline (Ctrl+U)" aria-label="Underline"> <FontAwesomeIcon icon={faUnderline}     aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-strike')}    title="Strikethrough"      aria-label="Strikethrough"><FontAwesomeIcon icon={faStrikethrough}aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-code')}      title="Inline code"        aria-label="Inline code"><FontAwesomeIcon icon={faCode}           aria-hidden="true" className="w-3.5 h-3.5" /></button>

      <span className={TB_DIVIDER} aria-hidden="true" />

      <ColorPicker
        iconOnly
        icon={faPalette}
        value={textColor}
        onChange={(c) => { setTextCol(c); onApplyFormat('color', c === null ? false : c); }}
        triggerLabel="Text color"
        showNoColor
        align="left"
      />
      <ColorPicker
        iconOnly
        icon={faHighlighter}
        value={bgColor}
        onChange={(c) => { setBgCol(c); onApplyFormat('background', c === null ? false : c); }}
        triggerLabel="Highlight"
        showNoColor
        align="left"
      />

      <span className={TB_DIVIDER} aria-hidden="true" />

      <button type="button" className={cn(TB_BTN, 'ql-list')}   value="bullet"  title="Bullet list"      aria-label="Bullet list">     <FontAwesomeIcon icon={faListUl}  aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-list')}   value="ordered" title="Numbered list"    aria-label="Numbered list">   <FontAwesomeIcon icon={faListOl}  aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-indent')} value="-1"      title="Decrease indent"  aria-label="Decrease indent"> <FontAwesomeIcon icon={faOutdent} aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-indent')} value="+1"      title="Increase indent"  aria-label="Increase indent"> <FontAwesomeIcon icon={faIndent}  aria-hidden="true" className="w-3.5 h-3.5" /></button>

      <span className={TB_DIVIDER} aria-hidden="true" />

      <button type="button" className={cn(TB_BTN, 'ql-script')} value="sub"   title="Subscript"   aria-label="Subscript">   <FontAwesomeIcon icon={faSubscript}   aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-script')} value="super" title="Superscript" aria-label="Superscript"> <FontAwesomeIcon icon={faSuperscript} aria-hidden="true" className="w-3.5 h-3.5" /></button>

      <span className={TB_DIVIDER} aria-hidden="true" />

      <button type="button" className={cn(TB_BTN, 'ql-link')}  title="Insert link"             aria-label="Insert link">      <FontAwesomeIcon icon={faLink}  aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-image')} title="Insert image"            aria-label="Insert image">     <FontAwesomeIcon icon={faImage} aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={TB_BTN}                 title="Insert table"            aria-label="Insert table"      onClick={onInsertTable}>                 <FontAwesomeIcon icon={faTable}     aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={TB_BTN}                 title="Insert horizontal rule"  aria-label="Insert horizontal rule" onClick={onInsertHR}>             <FontAwesomeIcon icon={faMinus}     aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={TB_BTN}                 title="Insert emoji"            aria-label="Insert emoji"
        onClick={(e) => openEmoji((e.currentTarget as HTMLElement).getBoundingClientRect())}>
        <FontAwesomeIcon icon={faFaceSmile} aria-hidden="true" className="w-3.5 h-3.5" />
      </button>

      <span className={TB_DIVIDER} aria-hidden="true" />

      <button type="button" className={cn(TB_BTN, 'ql-align')} value=""       title="Align left"   aria-label="Align left">   <FontAwesomeIcon icon={faAlignLeft}   aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-align')} value="center" title="Align center" aria-label="Align center"> <FontAwesomeIcon icon={faAlignCenter} aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={cn(TB_BTN, 'ql-align')} value="right"  title="Align right"  aria-label="Align right">  <FontAwesomeIcon icon={faAlignRight}  aria-hidden="true" className="w-3.5 h-3.5" /></button>

      <span className={TB_DIVIDER} aria-hidden="true" />

      <button type="button" className={cn(TB_BTN, 'ql-clean')} title="Clear formatting" aria-label="Clear formatting">
        <FontAwesomeIcon icon={faRemoveFormat} aria-hidden="true" className="w-3.5 h-3.5" />
      </button>

      <span className={TB_DIVIDER} aria-hidden="true" />

      <button type="button" className={TB_BTN} title="Undo (Ctrl+Z)"       aria-label="Undo" onClick={onUndo}><FontAwesomeIcon icon={faRotateLeft}  aria-hidden="true" className="w-3.5 h-3.5" /></button>
      <button type="button" className={TB_BTN} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" onClick={onRedo}><FontAwesomeIcon icon={faRotateRight} aria-hidden="true" className="w-3.5 h-3.5" /></button>

      <span className={TB_DIVIDER} aria-hidden="true" />

      <button type="button" className={cn(TB_BTN, htmlMode && 'text-primary bg-primary-subtle')}
        title={htmlMode ? 'Switch to visual editor' : 'Edit HTML source'} aria-label="Toggle HTML source"
        onClick={onToggleHtmlMode} aria-pressed={htmlMode}>
        <FontAwesomeIcon icon={faFileCode} aria-hidden="true" className="w-3.5 h-3.5" />
      </button>
      <button type="button" className={TB_BTN} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label="Fullscreen"
        onClick={onToggleFullscreen} aria-pressed={fullscreen}>
        <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} aria-hidden="true" className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

/** Toolbar references — used by Quill mount. */
export type QuillFormatFn = (q: QuillInstance, name: string, value: unknown) => void;
