/* =========================================================
   PUBLIC API
========================================================= */

export type RichTextEditorHandle = {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  getHTML: () => string;
  getText: () => string;
  setHTML: (html: string) => void;
  insertHTML: (html: string) => void;
  getDelta: () => unknown;
};

export type MentionUser = {
  id: string;
  label: string;
  description?: string;
};

export type SlashCommand = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action: (q: QuillInstance) => void;
};

export type RichTextEditorProps = {
  id: string;
  name?: string;
  label?: string;
  hint?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (html: string, delta?: unknown) => void;
  onBlur?: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  maxLength?: number;
  showCounter?: boolean;
  showWordCount?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
  sanitizeOnPaste?: boolean;
  autosaveKey?: string;
  mentions?: MentionUser[];
  slashItems?: SlashCommand[];
  className?: string;
};

/* =========================================================
   INTERNAL TYPES — minimal surface of Quill we touch.
========================================================= */

export type Range = { index: number; length: number };

export type QuillFormats = Record<string, unknown>;

export type QuillInstance = {
  getSelection: (focus?: boolean) => Range | null;
  setSelection: (index: number, length: number, source?: string) => void;
  getLength: () => number;
  getText: (index?: number, length?: number) => string;
  getBounds: (index: number, length?: number) => { left: number; top: number; width: number; height: number; bottom: number; right: number };
  getFormat: (range?: Range | number, length?: number) => QuillFormats;
  format: (name: string, value: unknown, source?: string) => void;
  formatLine: (index: number, length: number, name: string, value: unknown, source?: string) => void;
  formatText: (index: number, length: number, name: string, value: unknown, source?: string) => void;
  insertText: {
    (index: number, text: string, source?: string): void;
    (index: number, text: string, formats: QuillFormats, source?: string): void;
    (index: number, text: string, format: string, value: unknown, source?: string): void;
  };
  insertEmbed: (index: number, type: string, value: unknown, source?: string) => void;
  deleteText: (index: number, length: number, source?: string) => void;
  setText: (text: string, source?: string) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  focus: () => void;
  blur: () => void;
  enable: (enabled: boolean) => void;
  root: HTMLDivElement;
  container: HTMLDivElement;
  history: { undo: () => void; redo: () => void };
  clipboard: {
    dangerouslyPasteHTML: (html: string, source?: string) => void;
    dangerouslyPasteHTMLAtIndex?: (index: number, html: string, source?: string) => void;
  };
  getContents: (index?: number, length?: number) => unknown;
};

export type TriggerState = {
  open: boolean;
  query: string;
  trigger: number;
  pos: { top: number; left: number } | null;
  idx: number;
};

export type ImageSelection = {
  open: boolean;
  el: HTMLImageElement | null;
  rect: DOMRect | null;
};

export type BubbleState = {
  open: boolean;
  position: { top: number; left: number } | null;
};
