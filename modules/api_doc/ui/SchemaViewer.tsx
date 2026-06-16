'use client';
import { cn } from '@nb/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { SchemaObject } from './types';

const typeColors: Record<string, string> = {
  string:  'text-success-fg',
  number:  'text-primary',
  integer: 'text-primary',
  boolean: 'text-secondary',
  array:   'text-warning-fg',
  object:  'text-text-secondary',
  null:    'text-text-disabled',
};

function getTypeLabel(s: SchemaObject): string {
  if (!s) return '?';
  if (s.enum) return 'enum';
  if (s.$ref) return s.$ref.split('/').pop() ?? '?';
  const t = s.type ?? (s.properties ? 'object' : s.items ? 'array' : '?');
  if (t === 'array' && s.items) return `array[${s.items.type ?? '?'}]`;
  return t;
}

function getTypeColor(s: SchemaObject): string {
  if (!s) return 'text-text-secondary';
  const t = s.type ?? (s.properties ? 'object' : s.items ? 'array' : null);
  return typeColors[t ?? ''] ?? 'text-text-secondary';
}

function SchemaProperty({
  propKey,
  schema,
  required,
  depth,
}: {
  propKey: string;
  schema: SchemaObject;
  required: boolean;
  depth: number;
}) {
  const hasChildren =
    (schema.type === 'object' && schema.properties) ||
    (schema.type === 'array' && schema.items?.properties);
  const typeLabel = getTypeLabel(schema);
  const typeColor = getTypeColor(schema);
  const pills = [
    schema.nullable && 'nullable',
    schema.readOnly && 'read-only',
    schema.writeOnly && 'write-only',
    schema.deprecated && 'deprecated',
  ].filter(Boolean) as string[];

  if (hasChildren) {
    return (
      <details className="group" style={{ marginLeft: depth * 16 }}>
        <summary className="flex flex-wrap items-center gap-2 py-1 cursor-pointer list-none focus:outline-none">
          <FontAwesomeIcon icon={faChevronRight} className="text-[9px] text-text-disabled group-open:rotate-90 transition-transform" aria-hidden />
          <span className="font-mono font-semibold text-text-primary text-xs">
            {propKey}{required && <span className="text-error ml-0.5" title="required">*</span>}
          </span>
          <span className={cn('font-mono text-xs', typeColor)}>{typeLabel}</span>
          {pills.map((p) => (
            <span key={p} className="inline-block rounded px-1 py-0 text-[10px] border bg-surface-overlay text-text-disabled border-border">{p}</span>
          ))}
          {schema.description && <span className="text-text-secondary text-xs italic">{schema.description}</span>}
        </summary>
        <div className="ml-4 border-l border-border pl-3 mt-0.5">
          <SchemaViewer schema={schema.type === 'array' ? (schema.items ?? {}) : schema} depth={depth + 1} />
        </div>
      </details>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-0.5 text-xs pl-5" style={{ marginLeft: depth * 16 }}>
      <span className="font-mono font-semibold text-text-primary">
        {propKey}{required && <span className="text-error ml-0.5" title="required">*</span>}
      </span>
      <span className={cn('font-mono', typeColor)}>
        {typeLabel}
        {schema.format && <span className="text-text-disabled ml-1">({schema.format})</span>}
      </span>
      {pills.map((p) => (
        <span key={p} className="inline-block rounded px-1 py-0 text-[10px] border bg-surface-overlay text-text-disabled border-border">{p}</span>
      ))}
      {schema.description && <span className="text-text-secondary italic truncate max-w-xs">{schema.description}</span>}
      {schema.default !== undefined && (
        <span className="text-text-disabled">default: <code className="font-mono">{JSON.stringify(schema.default)}</code></span>
      )}
      {schema.enum?.map((v, i) => (
        <code key={i} className="rounded bg-surface-overlay px-1 py-0 text-[10px] font-mono border border-border">{JSON.stringify(v)}</code>
      ))}
    </div>
  );
}

export function SchemaViewer({
  schema,
  title,
  depth = 0,
  className,
}: {
  schema: SchemaObject;
  title?: string;
  depth?: number;
  className?: string;
}) {
  const properties = (schema.type === 'object' || schema.properties) ? (schema.properties ?? {}) : null;
  const required = schema.required ?? [];
  const isArray = schema.type === 'array';
  const enumVals = schema.enum;
  const constraints = [
    schema.minLength != null && `min: ${schema.minLength}`,
    schema.maxLength != null && `max: ${schema.maxLength}`,
    schema.minimum != null && `≥ ${schema.minimum}`,
    schema.maximum != null && `≤ ${schema.maximum}`,
    schema.pattern && `pattern: ${schema.pattern}`,
  ].filter(Boolean) as string[];

  return (
    <div className={cn('rounded-lg border border-border bg-surface-base text-sm overflow-hidden', className)}>
      {title && (
        <div className="px-3 py-2 border-b border-border bg-surface-raised text-xs font-semibold text-text-secondary uppercase tracking-wide">
          {title}
        </div>
      )}
      <div className="p-3 space-y-0.5">
        {enumVals && enumVals.length > 0 && (
          <div className="flex flex-wrap gap-1 py-1">
            {enumVals.map((v, i) => (
              <code key={i} className="rounded bg-surface-overlay px-1.5 py-0.5 text-xs font-mono text-text-primary border border-border">
                {JSON.stringify(v)}
              </code>
            ))}
          </div>
        )}

        {isArray && schema.items && (
          <div className="flex flex-wrap items-center gap-2 py-1 text-xs">
            <span className={cn('font-mono', getTypeColor(schema))}>array</span>
            <span className="text-text-disabled">→ items:</span>
            <span className={cn('font-mono', getTypeColor(schema.items))}>{getTypeLabel(schema.items)}</span>
            {schema.items.description && <span className="text-text-secondary italic">{schema.items.description}</span>}
          </div>
        )}

        {properties && Object.entries(properties).map(([key, prop]) => (
          <SchemaProperty
            key={key}
            propKey={key}
            schema={prop}
            required={required.includes(key)}
            depth={depth}
          />
        ))}

        {!properties && !isArray && !enumVals && (
          <p className="py-1 text-xs text-text-disabled italic">
            <span className={cn('font-mono', getTypeColor(schema))}>{getTypeLabel(schema)}</span>
            {schema.description && <> — {schema.description}</>}
          </p>
        )}

        {constraints.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-text-disabled">
            {constraints.map((c) => <span key={c}>{c}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}
