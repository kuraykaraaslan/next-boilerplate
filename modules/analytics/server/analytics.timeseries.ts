import type { TimeInterval } from './analytics.enums';
import type { TimeseriesPoint } from './analytics.types';

/**
 * Truncate a date to the start of its bucket for the given interval, in UTC.
 * Mirrors Postgres `date_trunc(interval, ts)` so DB-grouped rows and the gap
 * fill agree on bucket boundaries.
 *   - hour:  zero out minutes/seconds/ms
 *   - day:   midnight UTC
 *   - week:  midnight UTC of the Monday on/before the date (ISO week start)
 *   - month: first day of the month, midnight UTC
 */
export function truncateToBucket(date: Date, interval: TimeInterval): Date {
  const d = new Date(date.getTime());
  switch (interval) {
    case 'hour':
      d.setUTCMinutes(0, 0, 0);
      return d;
    case 'day':
      d.setUTCHours(0, 0, 0, 0);
      return d;
    case 'week': {
      d.setUTCHours(0, 0, 0, 0);
      // getUTCDay: 0=Sun..6=Sat. Shift back to Monday (Postgres week start).
      const day = d.getUTCDay();
      const diff = (day + 6) % 7; // days since Monday
      d.setUTCDate(d.getUTCDate() - diff);
      return d;
    }
    case 'month':
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(1);
      return d;
    default:
      return d;
  }
}

/** Advance a bucket-start date by exactly one interval, in UTC. */
function advance(date: Date, interval: TimeInterval): Date {
  const d = new Date(date.getTime());
  switch (interval) {
    case 'hour':
      d.setUTCHours(d.getUTCHours() + 1);
      return d;
    case 'day':
      d.setUTCDate(d.getUTCDate() + 1);
      return d;
    case 'week':
      d.setUTCDate(d.getUTCDate() + 7);
      return d;
    case 'month':
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d;
    default:
      return d;
  }
}

/**
 * Produce a dense timeseries: every bucket between `from` and `to` (inclusive of
 * the bucket containing each boundary) at the given interval, with counts from
 * `points` and `0` for any missing bucket. `points[].bucket` is matched on its
 * truncated ISO string, so DB rows produced by `date_trunc` line up exactly.
 *
 * Pure — no I/O, fully unit-testable.
 */
export function fillTimeseriesGaps(
  points: { bucket: string; count: number }[],
  from: Date,
  to: Date,
  interval: TimeInterval,
): TimeseriesPoint[] {
  // Index supplied counts by their normalized bucket boundary so input buckets
  // that aren't already truncated (or are duplicated) still align/aggregate.
  const counts = new Map<string, number>();
  for (const p of points) {
    const key = truncateToBucket(new Date(p.bucket), interval).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + p.count);
  }

  const out: TimeseriesPoint[] = [];
  const end = truncateToBucket(to, interval);
  let cursor = truncateToBucket(from, interval);
  // Guard against an inverted range producing an unbounded loop.
  while (cursor.getTime() <= end.getTime()) {
    const key = cursor.toISOString();
    out.push({ bucket: key, count: counts.get(key) ?? 0 });
    cursor = advance(cursor, interval);
  }
  return out;
}
