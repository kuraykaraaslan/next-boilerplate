import { describe, it, expect } from 'vitest';
import { TrackEventDTO, AnalyticsQueryDTO, TopEventsQuery } from '../analytics.dto';

describe('TrackEventDTO', () => {
  it('requires a non-empty name', () => {
    expect(TrackEventDTO.safeParse({ name: 'page_view' }).success).toBe(true);
    expect(TrackEventDTO.safeParse({ name: '' }).success).toBe(false);
    expect(TrackEventDTO.safeParse({}).success).toBe(false);
  });

  it('accepts anonymous + identified events with properties', () => {
    expect(
      TrackEventDTO.safeParse({ name: 'signup', anonymousId: 'a1', properties: { plan: 'pro', n: 3 } }).success,
    ).toBe(true);
    expect(TrackEventDTO.safeParse({ name: 'click', userId: 'u1', sessionId: 's1' }).success).toBe(true);
  });

  it('rejects an over-long name', () => {
    expect(TrackEventDTO.safeParse({ name: 'x'.repeat(121) }).success).toBe(false);
  });
});

describe('AnalyticsQueryDTO', () => {
  it('defaults interval to day and leaves dates optional', () => {
    const parsed = AnalyticsQueryDTO.parse({});
    expect(parsed.interval).toBe('day');
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
  });

  it('coerces ISO date strings to Date', () => {
    const parsed = AnalyticsQueryDTO.parse({ from: '2026-06-01', to: '2026-06-30', interval: 'week' });
    expect(parsed.from).toBeInstanceOf(Date);
    expect(parsed.to).toBeInstanceOf(Date);
    expect(parsed.interval).toBe('week');
  });

  it('rejects an invalid interval', () => {
    expect(AnalyticsQueryDTO.safeParse({ interval: 'decade' }).success).toBe(false);
  });
});

describe('TopEventsQuery', () => {
  it('coerces limit and caps it', () => {
    expect(TopEventsQuery.parse({ limit: '5' }).limit).toBe(5);
    expect(TopEventsQuery.parse({}).limit).toBe(10);
    expect(TopEventsQuery.safeParse({ limit: '500' }).success).toBe(false);
  });
});
