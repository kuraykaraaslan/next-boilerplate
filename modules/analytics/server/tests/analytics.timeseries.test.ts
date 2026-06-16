import { describe, it, expect } from 'vitest';
import { fillTimeseriesGaps, truncateToBucket } from '../analytics.timeseries';

describe('truncateToBucket (UTC)', () => {
  const d = new Date('2026-06-15T13:47:25.500Z'); // a Monday
  it('hour zeroes minutes/seconds/ms', () => {
    expect(truncateToBucket(d, 'hour').toISOString()).toBe('2026-06-15T13:00:00.000Z');
  });
  it('day → midnight UTC', () => {
    expect(truncateToBucket(d, 'day').toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });
  it('week → Monday midnight UTC', () => {
    // 2026-06-15 is a Monday → same day.
    expect(truncateToBucket(d, 'week').toISOString()).toBe('2026-06-15T00:00:00.000Z');
    // 2026-06-17 (Wed) → back to Monday the 15th.
    expect(truncateToBucket(new Date('2026-06-17T10:00:00Z'), 'week').toISOString()).toBe(
      '2026-06-15T00:00:00.000Z',
    );
  });
  it('month → first of month midnight UTC', () => {
    expect(truncateToBucket(d, 'month').toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });
});

describe('fillTimeseriesGaps', () => {
  it('fills missing day buckets with 0, boundaries inclusive', () => {
    const out = fillTimeseriesGaps(
      [{ bucket: '2026-06-02T00:00:00.000Z', count: 5 }],
      new Date('2026-06-01T08:00:00Z'),
      new Date('2026-06-03T20:00:00Z'),
      'day',
    );
    expect(out).toEqual([
      { bucket: '2026-06-01T00:00:00.000Z', count: 0 },
      { bucket: '2026-06-02T00:00:00.000Z', count: 5 },
      { bucket: '2026-06-03T00:00:00.000Z', count: 0 },
    ]);
  });

  it('aggregates duplicate / non-truncated input buckets into their boundary', () => {
    const out = fillTimeseriesGaps(
      [
        { bucket: '2026-06-01T03:00:00Z', count: 2 },
        { bucket: '2026-06-01T19:00:00Z', count: 3 },
      ],
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-01T23:00:00Z'),
      'day',
    );
    expect(out).toEqual([{ bucket: '2026-06-01T00:00:00.000Z', count: 5 }]);
  });

  it('supports hour interval', () => {
    const out = fillTimeseriesGaps(
      [{ bucket: '2026-06-15T13:00:00.000Z', count: 7 }],
      new Date('2026-06-15T12:30:00Z'),
      new Date('2026-06-15T14:10:00Z'),
      'hour',
    );
    expect(out.map((p) => p.count)).toEqual([0, 7, 0]);
    expect(out[0].bucket).toBe('2026-06-15T12:00:00.000Z');
  });

  it('returns a single bucket when from/to share one', () => {
    const out = fillTimeseriesGaps([], new Date('2026-06-15T01:00:00Z'), new Date('2026-06-15T05:00:00Z'), 'day');
    expect(out).toEqual([{ bucket: '2026-06-15T00:00:00.000Z', count: 0 }]);
  });

  it('does not loop forever on an inverted range', () => {
    const out = fillTimeseriesGaps([], new Date('2026-06-10T00:00:00Z'), new Date('2026-06-01T00:00:00Z'), 'day');
    expect(out).toEqual([]);
  });
});
