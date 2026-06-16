'use client';
import { useState } from 'react';
import { cn } from '@nb/common/server/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode } from '@fortawesome/free-solid-svg-icons';
import type { CodeSample } from './types';

export function CodeSamplePanel({ samples, className }: { samples: CodeSample[]; className?: string }) {
  const [active, setActive] = useState(0);

  if (!samples.length) return null;

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden bg-gray-950', className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
        <div className="flex gap-1 flex-wrap">
          {samples.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                i === active ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80',
              )}
            >
              {s.label ?? s.lang}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/40 hidden sm:block">
          <FontAwesomeIcon icon={faCode} className="text-[10px] mr-1" aria-hidden />
          {samples.length} sample{samples.length > 1 ? 's' : ''}
        </span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs text-white/90 font-mono leading-relaxed">
        <code>{samples[active]?.source}</code>
      </pre>
    </div>
  );
}
