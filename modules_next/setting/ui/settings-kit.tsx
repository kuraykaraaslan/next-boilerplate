'use client';
// Small shared helpers for tenant settings panels/pages.
import { Button } from '@/modules_next/common/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';

export type SR = Record<string, string>;

/** String <-> boolean helpers — settings values are stored as 'true' | 'false'. */
export function b(v: string | undefined) { return v === 'true'; }
export function bStr(v: boolean) { return v ? 'true' : 'false'; }

export function SaveRow({ loading }: { loading: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button type="submit" loading={loading} iconLeft={<FontAwesomeIcon icon={faSave} />}>
        Save
      </Button>
    </div>
  );
}
