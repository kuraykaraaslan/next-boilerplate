import { z } from 'zod';

export const OSNameEnum = z.enum([
    'Windows',
    'macOS',
    'Android',
    'iOS',
    'Chrome OS',
    'Linux',
    'Unix',
    'Unknown',
]);

export const DeviceTypeEnum = z.enum([
    'Mobile',
    'Tablet',
    'Desktop',
]);

export const BrowserNameEnum = z.enum([
    'Chrome',
    'Firefox',
    'Safari',
    'Edge',
    'IE',
    'Opera',
    'Postman',
    'Unknown',
]);

export type OSName = z.infer<typeof OSNameEnum>;
export type DeviceType = z.infer<typeof DeviceTypeEnum>;
export type BrowserName = z.infer<typeof BrowserNameEnum>;
