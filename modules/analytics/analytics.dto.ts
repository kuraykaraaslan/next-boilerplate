import { z } from 'zod';
import { TimeIntervalEnum } from './analytics.enums';

/**
 * Input for tracking one event. `properties` is an arbitrary string-keyed bag.
 * Tracking works for anonymous visitors, so every identity field is optional.
 */
export const TrackEventDTO = z.object({
  name: z.string().min(1).max(120),
  userId: z.string().max(256).optional(),
  anonymousId: z.string().max(256).optional(),
  sessionId: z.string().max(256).optional(),
  properties: z.record(z.string(), z.any()).optional(),
  path: z.string().max(2048).optional(),
  referrer: z.string().max(2048).optional(),
});

/**
 * Range/grouping query for summary + timeseries. Dates arrive as ISO strings and
 * are coerced to `Date`; both are optional — the service applies the defaults
 * (last 30 days → now) because zod defaults can't reference `Date.now()` safely
 * at module-load time.
 */
export const AnalyticsQueryDTO = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  interval: TimeIntervalEnum.default('day'),
  name: z.string().max(120).optional(),
});

export const TopEventsQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type TrackEventInput = z.infer<typeof TrackEventDTO>;
export type AnalyticsQueryInput = z.infer<typeof AnalyticsQueryDTO>;
export type TopEventsQueryInput = z.infer<typeof TopEventsQuery>;
