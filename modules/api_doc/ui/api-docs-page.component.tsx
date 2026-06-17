'use client';
import { useMemo, useState } from 'react';
import { cn } from '@kuraykaraaslan/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faFileContract, faArrowUpRightFromSquare, faShield, faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SecuritySchemeBadge } from './security-scheme-badge.component';
import { StatusCodeBadge } from './status-code-badge.component';
import { ApiTagSection } from './api-tag-section.component';
import type { ApiSpec, Operation, PathItem } from './types';

/** True if an operation matches the search query (summary, path, operationId, method, description). */
function matchesQuery(op: Operation, path: string, q: string): boolean {
  const haystack = [
    op.summary ?? '',
    path,
    op.operationId,
    op.method,
    op.description ?? '',
  ].join(' ').toLowerCase();
  return haystack.includes(q);
}

const STATUS_VARIANT: Record<string, string> = {
  ACTIVE:     'bg-success-subtle text-success-fg',
  DRAFT:      'bg-warning-subtle text-warning-fg',
  DEPRECATED: 'bg-error-subtle text-error-fg',
  SUNSET:     'bg-surface-overlay text-text-secondary',
};

const COMMON_RESPONSES: [string, string][] = [
  ['200','OK'],['201','Created'],['204','No Content'],
  ['400','Bad Request'],['401','Unauthorized'],['403','Forbidden'],
  ['404','Not Found'],['422','Unprocessable Entity'],['429','Too Many Requests'],
];

export function ApiDocsPage({ spec }: { spec: ApiSpec }) {
  const statusCls = STATUS_VARIANT[spec.status] ?? 'bg-surface-overlay text-text-secondary';
  const secSchemes = spec.components?.securitySchemes ? Object.entries(spec.components.securitySchemes) : [];
  const servers = spec.servers ?? [];

  const [query, setQuery] = useState('');

  // Filter paths' operations by the search query; only keep paths with matches.
  const filteredPaths = useMemo<PathItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return spec.paths;
    return spec.paths
      .map((pathItem) => ({
        ...pathItem,
        operations: pathItem.operations.filter((op) => matchesQuery(op, pathItem.path, q)),
      }))
      .filter((pathItem) => pathItem.operations.length > 0);
  }, [spec.paths, query]);

  const tagPathsMap = useMemo(() => {
    const map: Record<string, PathItem[]> = {};
    spec.tags.forEach((t) => { map[t.name] = []; });
    filteredPaths.forEach((pathItem) => {
      pathItem.operations.forEach((op) => {
        const tags = op.tags?.length ? op.tags : ['Default'];
        tags.forEach((tagName) => {
          if (!map[tagName]) map[tagName] = [];
          if (!map[tagName].find((p) => p.pathItemId === pathItem.pathItemId)) {
            map[tagName].push(pathItem);
          }
        });
      });
    });
    return map;
  }, [spec.tags, filteredPaths]);

  const isSearching = query.trim().length > 0;
  // When searching, only render tags that have at least one matching operation.
  const visibleTags = spec.tags.filter((tag) => (tagPathsMap[tag.name] ?? []).length > 0);
  const noResults = isSearching && visibleTags.length === 0;

  return (
    <div className="space-y-10 pb-16">

      <header className="space-y-5 pt-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-text-primary">{spec.info.title}</h1>
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusCls)}>
              {spec.status}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-text-disabled">
            <span>OpenAPI {spec.openapi}</span>
            <span aria-hidden>·</span>
            <span>v{spec.info.version}</span>
            {spec.info.summary && (
              <>
                <span aria-hidden>·</span>
                <span className="font-sans text-text-secondary">{spec.info.summary}</span>
              </>
            )}
          </div>
        </div>

        {spec.info.description && (
          <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">{spec.info.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-secondary">
          {spec.info.contact?.email && (
            <a href={`mailto:${spec.info.contact.email}`}
              className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" aria-hidden />
              {spec.info.contact.name ?? spec.info.contact.email}
            </a>
          )}
          {spec.info.license && (
            spec.info.license.url ? (
              <a href={spec.info.license.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <FontAwesomeIcon icon={faFileContract} className="text-[10px]" aria-hidden />
                {spec.info.license.name}
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[9px]" aria-hidden />
              </a>
            ) : (
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faFileContract} className="text-[10px]" aria-hidden />
                {spec.info.license.name}
              </span>
            )
          )}
          {spec.info.termsOfService && (
            <a href={spec.info.termsOfService} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-primary transition-colors">
              Terms of Service
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[9px]" aria-hidden />
            </a>
          )}
        </div>

        {secSchemes.length > 0 && (
          <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faShield} className="text-text-disabled text-xs" aria-hidden />
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Security schemes</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {secSchemes.map(([name, scheme]) => (
                <div key={name} className="flex items-start gap-2">
                  <SecuritySchemeBadge type={scheme.type} name={name} />
                  {scheme.description && (
                    <span className="text-xs text-text-secondary leading-5">{scheme.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Common responses</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_RESPONSES.map(([code]) => (
              <StatusCodeBadge key={code} code={code} />
            ))}
          </div>
        </div>
      </header>

      <hr className="border-border" />

      <div className="space-y-1.5">
        <label htmlFor="api-docs-search" className="sr-only">Search endpoints</label>
        <div className="relative">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-text-disabled"
            aria-hidden
          />
          <input
            id="api-docs-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search endpoints by summary, path, operationId, method…"
            className="w-full rounded-xl border border-border bg-surface-raised pl-9 pr-10 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-text-disabled hover:text-text-primary hover:bg-surface-overlay transition-colors"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" aria-hidden />
            </button>
          )}
        </div>
        {isSearching && !noResults && (
          <p className="text-xs text-text-disabled px-1">
            {visibleTags.length} matching tag{visibleTags.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="space-y-8">
        {noResults ? (
          <p className="text-sm text-text-disabled text-center py-10">
            No endpoints match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          visibleTags.map((tag) => (
            <section key={tag.name} id={`tag-${tag.name}`} className="scroll-mt-20">
              <ApiTagSection
                tag={tag}
                paths={tagPathsMap[tag.name] ?? []}
                servers={servers}
                defaultOpen
              />
            </section>
          ))
        )}
      </div>

      <footer className="pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-text-disabled">
        <span>{spec.info.title} · v{spec.info.version} · OpenAPI {spec.openapi}</span>
        {spec.info.contact?.email && (
          <a href={`mailto:${spec.info.contact.email}`} className="hover:text-text-primary transition-colors">
            {spec.info.contact.email}
          </a>
        )}
      </footer>
    </div>
  );
}
