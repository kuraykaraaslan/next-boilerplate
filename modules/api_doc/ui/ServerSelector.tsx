'use client';
import { useState } from 'react';
import { cn } from '@nb/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { Server } from './types';

const envVariant: Record<string, string> = {
  production:  'bg-success-subtle text-success-fg',
  staging:     'bg-warning-subtle text-warning-fg',
  development: 'bg-info-subtle text-info-fg',
  sandbox:     'bg-surface-overlay text-text-secondary',
};

export function ServerSelector({ servers, className }: { servers: Server[]; className?: string }) {
  const [active, setActive] = useState(servers[0]);
  const [open, setOpen] = useState(false);

  if (!servers.length) return null;

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2">
        <FontAwesomeIcon icon={faServer} className="text-text-disabled text-xs shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-text-primary truncate">{active.url}</p>
          {active.description && (
            <p className="text-[10px] text-text-secondary leading-tight">{active.description}</p>
          )}
        </div>
        {active.environment && (
          <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0', envVariant[active.environment] ?? 'bg-surface-overlay text-text-secondary')}>
            {active.environment}
          </span>
        )}
      </div>

      {servers.length > 1 && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 text-xs text-text-disabled hover:text-text-primary transition-colors"
          >
            <FontAwesomeIcon icon={faChevronRight} className={cn('text-[9px] transition-transform', open && 'rotate-90')} />
            All servers
          </button>
          {open && (
            <ul className="mt-1 rounded-lg border border-border bg-surface-raised py-1 max-h-52 overflow-auto shadow-lg">
              {servers.map((s) => (
                <li key={s.serverId}>
                  <button
                    type="button"
                    onClick={() => { setActive(s); setOpen(false); }}
                    className={cn(
                      'w-full flex items-start gap-2 px-3 py-2 hover:bg-surface-overlay transition-colors text-left',
                      s.serverId === active.serverId && 'bg-primary-subtle',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-text-primary truncate">{s.url}</p>
                      {s.description && <p className="text-[10px] text-text-secondary mt-0.5">{s.description}</p>}
                    </div>
                    {s.environment && (
                      <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 mt-0.5', envVariant[s.environment] ?? 'bg-surface-overlay text-text-secondary')}>
                        {s.environment}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
