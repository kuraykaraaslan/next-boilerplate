import { z } from 'zod';
import { LanguageCodeEnum, type LanguageCode } from '@kuraykaraaslan/common';

export const ThemeEnum = z.enum(['LIGHT', 'DARK', 'SYSTEM']);
// Single-sourced from @/modules/common (ISO 639-1) so the platform has ONE
// language code set. Aliases kept for back-compat with existing consumers.
export const LanguageEnum = LanguageCodeEnum;
export const DateFormatEnum = z.enum(['DD_MM_YYYY','MM_DD_YYYY']);
export const TimeFormatEnum = z.enum(['H24', 'H12']);
export const FirstDayOfWeekEnum = z.enum(['MON', 'SUN']);

// Number grouping/decimal conventions. Names describe (thousands)(decimal):
//  DOT_COMMA   → 1,234.56    (en-US, en-GB)
//  COMMA_DOT   → 1.234,56    (de-DE, tr-TR, most of EU)
//  SPACE_COMMA → 1 234,56    (fr-FR, ru-RU)
//  INDIAN      → 1,00,000.00 (en-IN lakh/crore grouping)
export const NumberFormatEnum = z.enum(['DOT_COMMA', 'COMMA_DOT', 'SPACE_COMMA', 'INDIAN']);

// Unit system — not derivable from locale alone (e.g. en-CA is metric).
export const MeasurementSystemEnum = z.enum(['METRIC', 'IMPERIAL']);

export type Theme = z.infer<typeof ThemeEnum>;
export type Language = LanguageCode;
export type DateFormat = z.infer<typeof DateFormatEnum>;
export type TimeFormat = z.infer<typeof TimeFormatEnum>;
export type FirstDayOfWeek = z.infer<typeof FirstDayOfWeekEnum>;
export type NumberFormat = z.infer<typeof NumberFormatEnum>;
export type MeasurementSystem = z.infer<typeof MeasurementSystemEnum>;
