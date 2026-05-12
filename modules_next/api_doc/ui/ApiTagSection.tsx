'use client';
import { cn } from '@/modules_next/common/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { EndpointRow } from './EndpointRow';
import type { Tag, PathItem } from './types';

export function ApiTagSection({
  tag,
  paths,
  defaultOpen = true,
  className,
}: {
  tag: Tag;
  paths: PathItem[];
  defaultOpen?: boolean;
  className?: string;
}) {
  const totalOps = paths.reduce((acc, p) => acc + p.operations.length, 0);

  return (
    <section className={cn('rounded-xl border border-border overflow-hidden', className)}>
      <details open={defaultOpen} className="group">
        <summary className="flex w-full items-center gap-3 px-5 py-4 text-left bg-surface-raised hover:bg-surface-overlay transition-colors cursor-pointer list-none focus:outline-none group-open:border-b group-open:border-border">
          <FontAwesomeIcon
            icon={faChevronDown}
            className="w-4 text-text-disabled shrink-0 group-open:rotate-0 -rotate-90 transition-transform text-xs"
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary">{tag.name}</h3>
              <span className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium bg-surface-sunken text-text-secondary">
                {totalOps}
              </span>
            </div>
            {tag.description && (
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{tag.description}</p>
            )}
          </div>
          {tag.externalDocs && (
            <a
              href={tag.externalDocs.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
              aria-label={`External docs for ${tag.name}`}
            >
              Docs
            </a>
          )}
        </summary>

        <div className="p-4 space-y-2 bg-surface-base">
          {paths.map((p) =>
            p.operations.map((op) => (
              <EndpointRow key={op.operationId} path={p.path} operation={op} />
            ))
          )}
        </div>
      </details>
    </section>
  );
}
