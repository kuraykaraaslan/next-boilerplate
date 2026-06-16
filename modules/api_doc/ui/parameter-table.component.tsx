import { cn } from '@nb/common/server/utils/cn';
import type { Parameter } from './types';

const locationStyle: Record<string, string> = {
  path:   'text-primary bg-primary-subtle',
  query:  'text-info-fg bg-info-subtle',
  header: 'text-warning-fg bg-warning-subtle',
  cookie: 'text-text-secondary bg-surface-overlay',
};

function typeStr(schema: Parameter['schema']) {
  if (!schema) return '—';
  if (schema.$ref) return schema.$ref.split('/').pop() ?? '?';
  return schema.type ?? '?';
}

export function ParameterTable({ parameters, className }: { parameters: Parameter[]; className?: string }) {
  if (!parameters.length) return null;
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-1/4">Name</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-16">In</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-24">Type</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-20">Req</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {parameters.map((param) => (
            <tr key={param.name} className="bg-surface-base hover:bg-surface-raised transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <code className="font-mono text-xs font-semibold text-text-primary">{param.name}</code>
                  {param.deprecated && (
                    <span className="text-[10px] rounded bg-warning-subtle text-warning-fg px-1 py-0.5 border border-warning/30 font-medium">deprecated</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium', locationStyle[param.in] ?? 'text-text-secondary bg-surface-overlay')}>
                  {param.in}
                </span>
              </td>
              <td className="px-4 py-3">
                <code className="font-mono text-xs text-text-secondary">
                  {typeStr(param.schema)}
                  {param.schema?.format && <span className="text-text-disabled ml-1">({param.schema.format})</span>}
                </code>
              </td>
              <td className="px-4 py-3">
                {param.required
                  ? <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-error-subtle text-error-fg">req</span>
                  : <span className="text-xs text-text-disabled">opt</span>
                }
              </td>
              <td className="px-4 py-3 text-xs text-text-secondary">
                {param.description ?? '—'}
                {param.schema?.enum && param.schema.enum.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {param.schema.enum.map((v, i) => (
                      <code key={i} className="rounded bg-surface-sunken px-1 py-0 text-[10px] font-mono text-text-secondary border border-border">
                        {String(v)}
                      </code>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
