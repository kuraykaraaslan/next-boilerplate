'use client';
import { cn } from '@kuraykaraaslan/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { SchemaViewer } from './schema-viewer.component';
import type { ApiResponse } from './types';

function getStatusStyle(code: string) {
  const n = parseInt(code, 10);
  if (n >= 200 && n < 300) return 'bg-success-subtle text-success-fg';
  if (n >= 300 && n < 400) return 'bg-info-subtle text-info-fg';
  if (n >= 400 && n < 500) return 'bg-warning-subtle text-warning-fg';
  if (n >= 500) return 'bg-error-subtle text-error-fg';
  return 'bg-surface-overlay text-text-secondary';
}

export function ResponseCard({
  response,
  defaultOpen,
  className,
}: {
  response: ApiResponse;
  defaultOpen?: boolean;
  className?: string;
}) {
  const contentEntries = response.content ? Object.entries(response.content) : [];
  const headers = response.headers ? Object.entries(response.headers) : [];

  return (
    <details
      className={cn('rounded-lg border border-border overflow-hidden group', className)}
      open={defaultOpen}
    >
      <summary className="flex w-full items-center gap-3 px-4 py-3 text-left bg-surface-raised hover:bg-surface-overlay transition-colors cursor-pointer list-none focus:outline-none">
        <span className={cn('inline-flex items-center rounded-full font-medium px-2 py-0.5 text-xs shrink-0', getStatusStyle(response.statusCode))}>
          {response.statusCode}
        </span>
        <span className="flex-1 text-sm text-text-primary">{response.description ?? ''}</span>
        {contentEntries[0] && (
          <span className="text-xs text-text-disabled font-mono shrink-0 hidden sm:block">{contentEntries[0][0]}</span>
        )}
        <FontAwesomeIcon icon={faChevronDown} className="text-[10px] text-text-disabled shrink-0 group-open:rotate-180 transition-transform" aria-hidden />
      </summary>

      <div className="border-t border-border bg-surface-base">
        {headers.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Response Headers</p>
            <div className="space-y-1.5">
              {headers.map(([key, hdr]) => (
                <div key={key} className="flex items-start gap-3 text-xs">
                  <code className="font-mono text-text-primary shrink-0">{key}</code>
                  {hdr.schema?.type && (
                    <span className="rounded-full bg-surface-overlay text-text-secondary text-[10px] px-1.5 py-0.5">{hdr.schema.type}</span>
                  )}
                  {hdr.description && <span className="text-text-secondary">{hdr.description}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {contentEntries.length > 0 ? (
          <div className="p-4 space-y-3">
            {contentEntries.map(([mime, obj]) => (
              <div key={mime}>
                <p className="text-xs font-mono text-text-disabled mb-2">{mime}</p>
                {obj.schema && <SchemaViewer schema={obj.schema} />}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-3 text-xs text-text-disabled">No response body.</p>
        )}
      </div>
    </details>
  );
}
