import { z } from 'zod';
import {
  ThemeEnum,
  LanguageEnum,
  DateFormatEnum,
  TimeFormatEnum,
  FirstDayOfWeekEnum
} from './user_preferences.enums';

export const UpdatePreferencesRequestSchema = z.object({
  theme: ThemeEnum.nullable().transform(val => val ?? 'LIGHT'),
  language: LanguageEnum.nullable().transform(val => val ?? 'EN'),
  emailNotifications: z.boolean().nullable().transform(val => val ?? true),
  smsNotifications: z.boolean().nullable().transform(val => val ?? false),
  pushNotifications: z.boolean().nullable().transform(val => val ?? false),
  newsletter: z.boolean().nullable().transform(val => val ?? true),
  timezone: z.string().nullable().transform(val => val ?? 'UTC'),
  dateFormat: DateFormatEnum.nullable().optional().transform(val => val ?? 'DD_MM_YYYY'),
  timeFormat: TimeFormatEnum.nullable().optional().transform(val => val ?? 'H24'),
  firstDayOfWeek: FirstDayOfWeekEnum.nullable().transform(val => val ?? 'MON')
});

export type UpdatePreferencesRequest = z.infer<typeof UpdatePreferencesRequestSchema>;
