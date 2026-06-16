'use client';

import { useMemo, useState } from 'react';
import { cn } from '@nb/common/server/utils/cn';
import { Badge } from '@nb/common/ui/badge.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faImage,
  faFileLines,
  faTableCells,
  faFilePowerpoint,
  faFileZipper,
  faMusic,
  faFilm,
  faCode,
  faPlus,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type ExtensionGroup = {
  key: string;
  label: string;
  icon: IconDefinition;
  extensions: string[];
};

const EXTENSION_GROUPS: ExtensionGroup[] = [
  { key: 'images', label: 'Images', icon: faImage,
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'tiff', 'ico'] },
  { key: 'documents', label: 'Documents', icon: faFileLines,
    extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md'] },
  { key: 'spreadsheets', label: 'Spreadsheets', icon: faTableCells,
    extensions: ['xls', 'xlsx', 'csv', 'ods'] },
  { key: 'presentations', label: 'Presentations', icon: faFilePowerpoint,
    extensions: ['ppt', 'pptx', 'odp', 'key'] },
  { key: 'archives', label: 'Archives', icon: faFileZipper,
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'] },
  { key: 'audio', label: 'Audio', icon: faMusic,
    extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] },
  { key: 'video', label: 'Video', icon: faFilm,
    extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
  { key: 'code', label: 'Code & Data', icon: faCode,
    extensions: ['json', 'xml', 'yaml', 'yml', 'sql', 'html', 'css'] },
];

const KNOWN_EXTENSIONS = new Set(EXTENSION_GROUPS.flatMap((g) => g.extensions));

function parse(value: string): Set<string> {
  return new Set(
    value
      .split(',')
      .map((e) => e.trim().toLowerCase().replace(/^\./, ''))
      .filter(Boolean),
  );
}

function serialize(set: Set<string>): string {
  return Array.from(set).join(',');
}

export function AllowedExtensionsField({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const selected = useMemo(() => parse(value), [value]);
  const [custom, setCustom] = useState('');

  const customExtensions = useMemo(
    () => Array.from(selected).filter((e) => !KNOWN_EXTENSIONS.has(e)),
    [selected],
  );

  const allowAll = selected.size === 0;

  function commit(next: Set<string>) {
    onChange(serialize(next));
  }

  function toggleExtension(ext: string) {
    const next = new Set(selected);
    if (next.has(ext)) next.delete(ext);
    else next.add(ext);
    commit(next);
  }

  function toggleGroup(group: ExtensionGroup) {
    const next = new Set(selected);
    const allOn = group.extensions.every((e) => next.has(e));
    for (const e of group.extensions) {
      if (allOn) next.delete(e);
      else next.add(e);
    }
    commit(next);
  }

  function addCustom() {
    const parsed = parse(custom);
    if (parsed.size === 0) return;
    const next = new Set(selected);
    for (const e of parsed) next.add(e);
    commit(next);
    setCustom('');
  }

  function removeCustom(ext: string) {
    const next = new Set(selected);
    next.delete(ext);
    commit(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-text-primary">Allowed Extensions</label>
        {allowAll ? (
          <Badge variant="info" size="sm">All file types allowed</Badge>
        ) : (
          <Badge variant="primary" size="sm">{selected.size} selected</Badge>
        )}
      </div>

      <p className="text-xs text-text-secondary">
        Pick the file formats users may upload. Leave everything unselected to allow all types.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXTENSION_GROUPS.map((group) => {
          const count = group.extensions.filter((e) => selected.has(e)).length;
          const allOn = count === group.extensions.length;
          const someOn = count > 0;
          return (
            <div
              key={group.key}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                someOn ? 'border-primary/40 bg-primary-subtle/30' : 'border-border bg-surface-base',
              )}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <FontAwesomeIcon
                    icon={group.icon}
                    className={cn('w-3.5 h-3.5', someOn ? 'text-primary' : 'text-text-disabled')}
                  />
                  {group.label}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                  {count}/{group.extensions.length}
                  {allOn && <FontAwesomeIcon icon={faCircleCheck} className="w-3 h-3 text-primary" />}
                </span>
              </button>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {group.extensions.map((ext) => {
                  const on = selected.has(ext);
                  return (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => toggleExtension(ext)}
                      aria-pressed={on}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
                        on
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-surface-base text-text-secondary hover:border-border-focus hover:text-text-primary',
                      )}
                    >
                      .{ext}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-surface-base p-3 space-y-2">
        <span className="block text-sm font-medium text-text-primary">Custom extensions</span>
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="e.g. dwg, psd, epub"
            className="block w-full rounded-md border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          />
          <button
            type="button"
            onClick={addCustom}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-base px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
            Add
          </button>
        </div>
        {customExtensions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {customExtensions.map((ext) => (
              <Badge key={ext} variant="neutral" dismissible onDismiss={() => removeCustom(ext)}>
                .{ext}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
