import { z } from 'zod';
import { OSNameEnum, DeviceTypeEnum, BrowserNameEnum } from './user_agent.enums';

export const GeoLocationSchema = z.object({
    city: z.string().nullable(),
    state: z.string().nullable(),
    country: z.string().nullable(),
    countryCode: z.string().nullable().nullable(),
    latitude: z.number().nullable().nullable(),
    longitude: z.number().nullable().nullable(),
});

export const DeviceInfoSchema = z.object({
    osName: OSNameEnum,
    osVersion: z.string().nullable(),
    browserName: BrowserNameEnum,
    browserVersion: z.string().nullable(),
    deviceType: DeviceTypeEnum,
    deviceName: z.string().nullable(),
});

export type GeoLocation = z.infer<typeof GeoLocationSchema>;
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;
