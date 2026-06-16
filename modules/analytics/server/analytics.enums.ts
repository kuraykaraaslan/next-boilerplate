import { z } from 'zod';

// Granularity of a timeseries bucket. Maps 1:1 to a Postgres `date_trunc` unit.
export const TimeIntervalEnum = z.enum(['hour', 'day', 'week', 'month']);
export type TimeInterval = z.infer<typeof TimeIntervalEnum>;
