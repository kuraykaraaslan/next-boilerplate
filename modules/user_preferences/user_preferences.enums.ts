import { z } from 'zod';

export const ThemeEnum = z.enum(['LIGHT', 'DARK', 'SYSTEM']);
export const LanguageEnum = z.enum(['EN', 'ES', 'FR', 'DE', 'CN', 'JP']);
export const DateFormatEnum = z.enum(['DD/MM/YYYY', 'MM/DD/YYYY']);
export const TimeFormatEnum = z.enum(['24H', '12H']);
export const FirstDayOfWeekEnum = z.enum(['MON', 'SUN']);

export type Theme = z.infer<typeof ThemeEnum>;
export type Language = z.infer<typeof LanguageEnum>;
export type DateFormat = z.infer<typeof DateFormatEnum>;
export type TimeFormat = z.infer<typeof TimeFormatEnum>;
export type FirstDayOfWeek = z.infer<typeof FirstDayOfWeekEnum>;
