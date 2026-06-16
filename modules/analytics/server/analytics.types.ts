import { z } from 'zod';

// A persisted analytics event as read back from the store.
export const AnalyticsEventSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  userId: z.string().uuid().nullable(),
  anonymousId: z.string().nullable(),
  sessionId: z.string().nullable(),
  properties: z.record(z.string(), z.any()).nullable(),
  path: z.string().nullable(),
  referrer: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// One bucket in a dense timeseries. `bucket` is an ISO date string.
export interface TimeseriesPoint {
  bucket: string;
  count: number;
}

// One row of a GROUP BY name aggregate.
export interface EventCount {
  name: string;
  count: number;
}

// Top-line aggregate over a date range.
export interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  topEvents: EventCount[];
}
