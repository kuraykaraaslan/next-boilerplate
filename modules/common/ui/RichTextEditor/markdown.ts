/* =========================================================
   MARKDOWN SHORTCUTS
   Typed inline patterns converted on space / enter / typing.
   Inline:   **bold**, *italic*, `code`, ~~strike~~
   Block:    #, ##, ### (headings), > (quote), -, *, 1. (lists), ``` (code-block)
========================================================= */

import type { QuillInstance } from './types';

export function applyMarkdownShortcuts(q: QuillInstance): void {
  const sel = q.getSelection();
  if (!sel || sel.length > 0) return;
  const [lineStart, lineText] = readCurrentLine(q, sel.index);
  if (!lineText) return;

  // Block-level (only when caret at end-of-line)
  const caretCol = sel.index - lineStart;
  if (caretCol === lineText.length) {
    const block = matchBlockShortcut(lineText);
    if (block) {
      q.formatLine(lineStart, 0, block.format, block.value, 'user');
      q.deleteText(lineStart, block.consume, 'user');
      return;
    }
  }

  // Inline (search backwards a bit)
  const window = q.getText(Math.max(0, sel.index - 40), 40);
  const inline = matchInlineShortcut(window);
  if (inline) {
    const absStart = sel.index - (window.length - inline.start);
    q.deleteText(absStart, inline.length, 'user');
    q.insertText(absStart, inline.text, { [inline.format]: true } as unknown as QuillFormatsArg, 'user');
    q.setSelection(absStart + inline.text.length, 0, 'user');
  }
}

type QuillFormatsArg = Parameters<QuillInstance['insertText']>[2];

function readCurrentLine(q: QuillInstance, index: number): [number, string] {
  const total = q.getText();
  let start = index;
  while (start > 0 && total[start - 1] !== '\n') start--;
  let end = index;
  while (end < total.length && total[end] !== '\n') end++;
  return [start, total.slice(start, end)];
}

function matchBlockShortcut(line: string): { format: string; value: unknown; consume: number } | null {
  if (line === '# ')   return { format: 'header',     value: 1,        consume: 2 };
  if (line === '## ')  return { format: 'header',     value: 2,        consume: 3 };
  if (line === '### ') return { format: 'header',     value: 3,        consume: 4 };
  if (line === '> ')   return { format: 'blockquote', value: true,     consume: 2 };
  if (line === '- ' || line === '* ')
                       return { format: 'list',       value: 'bullet', consume: 2 };
  if (line === '1. ')  return { format: 'list',       value: 'ordered',consume: 3 };
  if (line === '```')  return { format: 'code-block', value: true,     consume: 3 };
  return null;
}

function matchInlineShortcut(window: string): { start: number; length: number; text: string; format: string } | null {
  let m = /\*\*([^*\n]+)\*\*$/.exec(window);
  if (m) return { start: m.index, length: m[0].length, text: m[1], format: 'bold' };
  m = /\*([^*\n]+)\*$/.exec(window);
  if (m) return { start: m.index, length: m[0].length, text: m[1], format: 'italic' };
  m = /`([^`\n]+)`$/.exec(window);
  if (m) return { start: m.index, length: m[0].length, text: m[1], format: 'code' };
  m = /~~([^~\n]+)~~$/.exec(window);
  if (m) return { start: m.index, length: m[0].length, text: m[1], format: 'strike' };
  return null;
}
