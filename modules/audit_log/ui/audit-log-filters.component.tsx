'use client';
import { useState } from 'react';
import { Input } from '@nb/common/ui/input.component';
import { Button } from '@nb/common/ui/button.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';

export interface AuditLogFilterValues {
  actor: string;
  action: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY: AuditLogFilterValues = { actor: '', action: '', dateFrom: '', dateTo: '' };

export function AuditLogFilters({
  onChange,
  className,
}: {
  onChange: (filters: AuditLogFilterValues) => void;
  className?: string;
}) {
  const [values, setValues] = useState<AuditLogFilterValues>(EMPTY);

  function set<K extends keyof AuditLogFilterValues>(key: K, val: string) {
    const next = { ...values, [key]: val };
    setValues(next);
    onChange(next);
  }

  function reset() {
    setValues(EMPTY);
    onChange(EMPTY);
  }

  const hasFilters = Object.values(values).some(Boolean);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          id="audit-actor"
          label="Actor"
          placeholder="Search by email…"
          prefixIcon={<FontAwesomeIcon icon={faMagnifyingGlass} className="w-3.5 h-3.5" />}
          value={values.actor}
          onChange={(e) => set('actor', e.target.value)}
        />
        <Input
          id="audit-action"
          label="Action"
          placeholder="e.g. USER_LOGIN"
          value={values.action}
          onChange={(e) => set('action', e.target.value)}
        />
        <Input
          id="audit-date-from"
          label="From"
          type="date"
          value={values.dateFrom}
          onChange={(e) => set('dateFrom', e.target.value)}
        />
        <Input
          id="audit-date-to"
          label="To"
          type="date"
          value={values.dateTo}
          onChange={(e) => set('dateTo', e.target.value)}
        />
      </div>
      {hasFilters && (
        <div className="flex justify-end mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            iconLeft={<FontAwesomeIcon icon={faXmark} />}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
