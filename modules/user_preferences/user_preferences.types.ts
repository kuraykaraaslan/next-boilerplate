import { z } from 'zod';
import { TimezoneSchema, DEFAULT_TIMEZONE, DEFAULT_LANGUAGE } from '@/modules/common';
import {
  ThemeEnum,
  LanguageEnum,
  DateFormatEnum,
  TimeFormatEnum,
  FirstDayOfWeekEnum
} from './user_preferences.enums';

export const UserPreferencesSchema = z.object({
  theme: ThemeEnum.default('SYSTEM'),
  language: LanguageEnum.default(DEFAULT_LANGUAGE),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
  newsletter: z.boolean().default(true),
  timezone: TimezoneSchema.default(DEFAULT_TIMEZONE),
  dateFormat: DateFormatEnum.default('DD_MM_YYYY'),
  timeFormat: TimeFormatEnum.default('H24'),
  firstDayOfWeek: FirstDayOfWeekEnum.default('MON')
});

export const UserPreferencesDefault: UserPreferences = {
  theme: 'SYSTEM',
  language: DEFAULT_LANGUAGE,
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  newsletter: true,
  timezone: 'UTC',
  dateFormat: 'DD_MM_YYYY',
  timeFormat: 'H24',
  firstDayOfWeek: 'MON'
};

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
