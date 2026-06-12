import { z } from 'zod';
import { LanguageCodeEnum, type LanguageCode } from '@/modules/common';

export const ThemeEnum = z.enum(['LIGHT', 'DARK', 'SYSTEM']);
// Single-sourced from @/modules/common (ISO 639-1) so the platform has ONE
// language code set. Aliases kept for back-compat with existing consumers.
export const LanguageEnum = LanguageCodeEnum;
export const DateFormatEnum = z.enum(['DD_MM_YYYY','MM_DD_YYYY']);
export const TimeFormatEnum = z.enum(['H24', 'H12']);
export const FirstDayOfWeekEnum = z.enum(['MON', 'SUN']);

export type Theme = z.infer<typeof ThemeEnum>;
export type Language = LanguageCode;
export type DateFormat = z.infer<typeof DateFormatEnum>;
export type TimeFormat = z.infer<typeof TimeFormatEnum>;
export type FirstDayOfWeek = z.infer<typeof FirstDayOfWeekEnum>;
