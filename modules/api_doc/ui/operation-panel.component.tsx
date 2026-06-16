'use client';
import { useState } from 'react';
import { cn } from '@nb/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faTriangleExclamation, faLink, faCheck } from '@fortawesome/free-solid-svg-icons';
import { TabGroup } from '@nb/common/ui/tab-group.component';
import { Badge } from '@nb/common/ui/badge.component';
import { ParameterTable } from './parameter-table.component';
import { SchemaViewer } from './schema-viewer.component';
import { ResponseCard } from './response-card.component';
import { CodeSamplePanel } from './code-sample-panel.component';
import { TryItOutPanel } from './try-it-out-panel.component';
import type { Operation, Server } from './types';

export function OperationPanel({
  operation,
  path,
  servers = [],
  className,
}: {
  operation: Operation;
  path?: string;
  servers?: Server[];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopyPermalink() {
    if (typeof window === 'undefined') return;
    const anchor = `op-${operation.operationId}`;
    window.location.hash = anchor;
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${anchor}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        },
        () => {},
      );
    }
  }

  const params = operation.parameters ?? [];
  const responses = operation.responses ?? [];
  const samples = operation.codeSamples ?? [];
  const reqBody = operation.requestBody;
  const security = operation.security ?? [];

  const pathParams   = params.filter((p) => p.in === 'path');
  const queryParams  = params.filter((p) => p.in === 'query');
  const headerParams = params.filter((p) => p.in === 'header');
  const cookieParams = params.filter((p) => p.in === 'cookie');
  const reqBodyContent = reqBody?.content ? Object.entries(reqBody.content) : [];

  const tabs = [
    {
      id: 'params',
      label: 'Parameters',
      badge: params.length > 0 ? (
        <Badge variant="neutral" size="sm">{params.length}</Badge>
      ) : undefined,
      content: (
        <div className="px-5 py-4 space-y-4">
          {!params.length && <p className="text-sm text-text-disabled text-center py-4">No parameters.</p>}
          {pathParams.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Path</h4>
              <ParameterTable parameters={pathParams} />
            </section>
          )}
          {queryParams.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Query</h4>
              <ParameterTable parameters={queryParams} />
            </section>
          )}
          {headerParams.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Headers</h4>
              <ParameterTable parameters={headerParams} />
            </section>
          )}
          {cookieParams.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Cookies</h4>
              <ParameterTable parameters={cookieParams} />
            </section>
          )}
        </div>
      ),
    },
    {
      id: 'body',
      label: 'Request Body',
      badge: reqBody ? (
        reqBody.required
          ? <Badge variant="error" size="sm">required</Badge>
          : <Badge variant="primary" size="sm">1</Badge>
      ) : undefined,
      content: (
        <div className="px-5 py-4 space-y-3">
          {!reqBody
            ? <p className="text-sm text-text-disabled text-center py-4">No request body.</p>
            : <>
                {reqBody.description && <p className="text-sm text-text-secondary">{reqBody.description}</p>}
                {reqBodyContent.map(([mime, obj]) => (
                  <div key={mime}>
                    <p className="text-xs font-mono text-text-disabled mb-2">{mime}</p>
                    {obj.schema && <SchemaViewer schema={obj.schema} />}
                  </div>
                ))}
              </>
          }
        </div>
      ),
    },
    {
      id: 'responses',
      label: 'Responses',
      badge: responses.length > 0 ? (
        <Badge variant="neutral" size="sm">{responses.length}</Badge>
      ) : undefined,
      content: (
        <div className="px-5 py-4 space-y-2">
          {!responses.length && <p className="text-sm text-text-disabled text-center py-4">No responses defined.</p>}
          {responses.map((res) => (
            <ResponseCard
              key={res.statusCode}
              response={res}
              defaultOpen={res.statusCode.startsWith('2')}
            />
          ))}
        </div>
      ),
    },
    ...(samples.length > 0 ? [{
      id: 'code',
      label: 'Code Samples',
      content: (
        <div className="p-4">
          <CodeSamplePanel samples={samples} />
        </div>
      ),
    }] : []),
  ];

  return (
    <div className={cn('rounded-xl border border-border bg-surface-base overflow-hidden', className)}>
      <div className="px-5 py-4 border-b border-border bg-surface-raised space-y-2">
        <div className="flex items-start justify-between gap-2">
          <code className="font-mono text-xs text-text-disabled">{operation.operationId}</code>
          <button
            type="button"
            onClick={handleCopyPermalink}
            className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-text-disabled hover:text-primary hover:bg-surface-overlay transition-colors shrink-0"
            aria-label={`Copy permalink to ${operation.operationId}`}
            title="Copy permalink"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faLink} className="text-[10px]" aria-hidden />
            {copied ? 'Copied' : 'Permalink'}
          </button>
        </div>
        {operation.deprecated && (
          <div className="flex items-center gap-2 text-xs text-warning-fg bg-warning-subtle rounded px-3 py-1.5">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs shrink-0" aria-hidden />
            This operation is deprecated.
          </div>
        )}
        {operation.description && (
          <p className="text-sm text-text-secondary">{operation.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {operation.tags?.map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-surface-sunken text-text-secondary">
              {tag}
            </span>
          ))}
          {security.map((scheme, i) => {
            const name = Object.keys(scheme)[0] ?? '';
            return (
              <span key={i} className="inline-flex items-center gap-1 rounded-full font-medium px-2 py-0.5 text-xs bg-info-subtle text-info-fg">
                <FontAwesomeIcon icon={faLock} className="text-[10px]" aria-hidden />
                {name}
              </span>
            );
          })}
        </div>
      </div>

      <TabGroup tabs={tabs} label={`${operation.method} ${operation.operationId}`} lazy />

      {path && (
        <div className="border-t border-border p-4">
          <TryItOutPanel operation={operation} path={path} servers={servers} />
        </div>
      )}
    </div>
  );
}
