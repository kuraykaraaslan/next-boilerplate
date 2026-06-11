'use client';
import { useMemo, useState } from 'react';
import { cn } from '@/modules_next/common/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faChevronDown,
  faSpinner,
  faKey,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import type { Operation, Server, SchemaObject } from './types';

interface TryResult {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  isJson: boolean;
  durationMs: number;
}

/** Build a sample JSON value from a schema, for prefilling the request body editor. */
function sampleFromSchema(schema?: SchemaObject): unknown {
  if (!schema) return undefined;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  switch (schema.type) {
    case 'object': {
      const out: Record<string, unknown> = {};
      const props = schema.properties ?? {};
      Object.entries(props).forEach(([key, propSchema]) => {
        if (propSchema.readOnly) return;
        out[key] = sampleFromSchema(propSchema);
      });
      return out;
    }
    case 'array':
      return schema.items ? [sampleFromSchema(schema.items)] : [];
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'string':
    default:
      if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'date-time') return new Date().toISOString();
      return '';
  }
}

function initialBody(operation: Operation): string {
  const content = operation.requestBody?.content;
  if (!content) return '';
  const json = content['application/json'];
  if (!json?.schema) return '';
  try {
    return JSON.stringify(sampleFromSchema(json.schema), null, 2);
  } catch {
    return '';
  }
}

export function TryItOutPanel({
  operation,
  path,
  servers,
  className,
}: {
  operation: Operation;
  path: string;
  servers: Server[];
  className?: string;
}) {
  const params = operation.parameters ?? [];
  const pathParams = useMemo(() => params.filter((p) => p.in === 'path'), [params]);
  const queryParams = useMemo(() => params.filter((p) => p.in === 'query'), [params]);
  const hasBody = !!operation.requestBody && operation.method !== 'GET' && operation.method !== 'HEAD';

  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [serverIdx, setServerIdx] = useState(0);
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState<string>(() => initialBody(operation));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryResult | null>(null);

  const baseUrl = servers[serverIdx]?.url ?? servers[0]?.url ?? '';

  const interpolatedPath = useMemo(() => {
    let p = path;
    pathParams.forEach((param) => {
      const v = pathValues[param.name] ?? '';
      p = p.replace(`{${param.name}}`, encodeURIComponent(v) || `{${param.name}}`);
    });
    return p;
  }, [path, pathParams, pathValues]);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    queryParams.forEach((param) => {
      const v = queryValues[param.name];
      if (v !== undefined && v !== '') qs.append(param.name, v);
    });
    const str = qs.toString();
    return str ? `?${str}` : '';
  }, [queryParams, queryValues]);

  const fullUrl = `${baseUrl}${interpolatedPath}${queryString}`;

  async function handleSend() {
    setLoading(true);
    setError(null);
    setResult(null);
    const started = performance.now();
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      let bodyToSend: string | undefined;
      if (hasBody && body.trim()) {
        headers['Content-Type'] = 'application/json';
        // Validate JSON before sending; surface parse errors to the user.
        try {
          JSON.parse(body);
        } catch {
          setError('Request body is not valid JSON.');
          setLoading(false);
          return;
        }
        bodyToSend = body;
      }

      const res = await fetch(fullUrl, {
        method: operation.method,
        headers,
        body: bodyToSend,
      });
      const durationMs = Math.round(performance.now() - started);
      const text = await res.text();
      const ct = res.headers.get('content-type') ?? '';
      const isJson = ct.includes('application/json');
      let displayBody = text;
      if (isJson) {
        try {
          displayBody = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          displayBody = text;
        }
      }
      setResult({
        status: res.status,
        statusText: res.statusText,
        headers: Array.from(res.headers.entries()),
        body: displayBody,
        isJson,
        durationMs,
      });
    } catch (e) {
      const durationMs = Math.round(performance.now() - started);
      setError(
        e instanceof Error
          ? `${e.message} (after ${durationMs}ms). This may be a network/CORS error.`
          : 'Request failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary transition-colors';

  return (
    <div className={cn('rounded-xl border border-border bg-surface-base overflow-hidden', className)}>
      <details open={open} className="group" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="flex w-full items-center gap-3 px-5 py-3 text-left bg-surface-raised hover:bg-surface-overlay transition-colors cursor-pointer list-none focus:outline-none">
          <FontAwesomeIcon icon={faPlay} className="text-xs text-success-fg shrink-0" aria-hidden />
          <span className="flex-1 text-sm font-semibold text-text-primary">Try it out</span>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="text-[10px] text-text-disabled group-open:rotate-180 transition-transform"
            aria-hidden
          />
        </summary>

        <div className="px-5 py-4 space-y-4">
          {/* Auth */}
          <div>
            <label
              htmlFor={`tryout-token-${operation.operationId}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5"
            >
              <FontAwesomeIcon icon={faKey} className="text-[10px]" aria-hidden />
              Bearer Token
            </label>
            <input
              id={`tryout-token-${operation.operationId}`}
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste an API key / bearer token"
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-text-disabled">Sent as Authorization: Bearer. Held in memory only — never stored.</p>
          </div>

          {/* Server */}
          {servers.length > 0 && (
            <div>
              <label
                htmlFor={`tryout-server-${operation.operationId}`}
                className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5"
              >
                Server
              </label>
              <select
                id={`tryout-server-${operation.operationId}`}
                value={serverIdx}
                onChange={(e) => setServerIdx(Number(e.target.value))}
                className={inputCls}
              >
                {servers.map((s, i) => (
                  <option key={s.serverId} value={i}>
                    {s.url}
                    {s.environment ? ` (${s.environment})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Path params */}
          {pathParams.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Path Parameters</h4>
              {pathParams.map((p) => (
                <div key={p.name}>
                  <label
                    htmlFor={`tryout-path-${operation.operationId}-${p.name}`}
                    className="block text-xs text-text-secondary mb-1"
                  >
                    <code className="font-mono text-text-primary">{p.name}</code>
                    {p.required && <span className="text-error-fg ml-1">*</span>}
                  </label>
                  <input
                    id={`tryout-path-${operation.operationId}-${p.name}`}
                    type="text"
                    value={pathValues[p.name] ?? ''}
                    onChange={(e) => setPathValues((v) => ({ ...v, [p.name]: e.target.value }))}
                    placeholder={p.description ?? p.name}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Query params */}
          {queryParams.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Query Parameters</h4>
              {queryParams.map((p) => (
                <div key={p.name}>
                  <label
                    htmlFor={`tryout-query-${operation.operationId}-${p.name}`}
                    className="block text-xs text-text-secondary mb-1"
                  >
                    <code className="font-mono text-text-primary">{p.name}</code>
                    {p.required && <span className="text-error-fg ml-1">*</span>}
                  </label>
                  <input
                    id={`tryout-query-${operation.operationId}-${p.name}`}
                    type="text"
                    value={queryValues[p.name] ?? ''}
                    onChange={(e) => setQueryValues((v) => ({ ...v, [p.name]: e.target.value }))}
                    placeholder={p.description ?? p.name}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          {hasBody && (
            <div>
              <label
                htmlFor={`tryout-body-${operation.operationId}`}
                className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5"
              >
                Request Body (JSON)
              </label>
              <textarea
                id={`tryout-body-${operation.operationId}`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                spellCheck={false}
                className={cn(inputCls, 'font-mono text-xs resize-y')}
              />
            </div>
          )}

          {/* URL preview + send */}
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2 overflow-x-auto">
              <code className="font-mono text-xs text-text-secondary whitespace-nowrap">
                <span className="text-primary font-semibold mr-2">{operation.method}</span>
                {fullUrl}
              </code>
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <FontAwesomeIcon icon={loading ? faSpinner : faPlay} className={cn('text-xs', loading && 'animate-spin')} aria-hidden />
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-error-subtle text-error-fg px-3 py-2 text-xs">
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs shrink-0 mt-0.5" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    result.status >= 200 && result.status < 300
                      ? 'bg-success-subtle text-success-fg'
                      : result.status >= 400
                        ? 'bg-error-subtle text-error-fg'
                        : 'bg-warning-subtle text-warning-fg',
                  )}
                >
                  {result.status} {result.statusText}
                </span>
                <span className="text-xs text-text-disabled font-mono">{result.durationMs} ms</span>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">Response Headers</h4>
                <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2 max-h-40 overflow-auto">
                  {result.headers.length === 0 ? (
                    <p className="text-xs text-text-disabled">No headers.</p>
                  ) : (
                    <dl className="text-xs font-mono space-y-0.5">
                      {result.headers.map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-text-secondary shrink-0">{k}:</dt>
                          <dd className="text-text-primary break-all">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">Response Body</h4>
                <pre className="rounded-lg border border-border bg-gray-950 p-4 text-xs text-white/90 font-mono leading-relaxed overflow-auto max-h-96">
                  <code>{result.body || '(empty)'}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
