'use client';
import { cn } from '@/libs/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faLock, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { HttpMethodBadge } from './HttpMethodBadge';
import { OperationPanel } from './OperationPanel';
import type { Operation } from './types';

export function EndpointRow({
  path,
  operation,
  defaultOpen = false,
  className,
}: {
  path: string;
  operation: Operation;
  defaultOpen?: boolean;
  className?: string;
}) {
  const hasSecurity = (operation.security?.length ?? 0) > 0;

  return (
    <div
      id={operation.operationId ? `op-${operation.operationId}` : undefined}
      className={cn('rounded-xl border border-border overflow-hidden scroll-mt-20', className)}
    >
      <details open={defaultOpen} className="group">
        <summary className="flex w-full items-center gap-3 px-4 py-3 text-left bg-surface-raised hover:bg-surface-overlay transition-colors cursor-pointer list-none focus:outline-none group-open:border-b group-open:border-border">
          <HttpMethodBadge method={operation.method} />
          <code className="flex-1 truncate font-mono text-sm text-text-primary">{path}</code>
          <div className="flex items-center gap-2 shrink-0">
            {operation.summary && (
              <span className="hidden sm:block text-xs text-text-secondary truncate max-w-xs">{operation.summary}</span>
            )}
            {hasSecurity && (
              <FontAwesomeIcon icon={faLock} className="text-xs text-text-disabled" aria-label="Requires authentication" />
            )}
            {operation.deprecated && (
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs text-warning" aria-label="Deprecated" />
            )}
            <FontAwesomeIcon icon={faChevronDown} className="text-[10px] text-text-disabled group-open:rotate-180 transition-transform" aria-hidden />
          </div>
        </summary>
        <OperationPanel operation={operation} className="rounded-none border-0" />
      </details>
    </div>
  );
}
