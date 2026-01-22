import { z } from 'zod';
import {
  ThemeEnum,
  LanguageEnum,
  DateFormatEnum,
  TimeFormatEnum,
  FirstDayOfWeekEnum
} from './user_preferences.enums';

export const UpdatePreferencesRequestSchema = z.object({
  theme: ThemeEnum.nullable(),
  language: LanguageEnum.nullable(),
  emailNotifications: z.boolean().nullable(),
  smsNotifications: z.boolean().nullable(),
  pushNotifications: z.boolean().nullable(),
  newsletter: z.boolean().nullable(),
  timezone: z.string().nullable(),
  dateFormat: DateFormatEnum.nullable(),
  timeFormat: TimeFormatEnum.nullable(),
  firstDayOfWeek: FirstDayOfWeekEnum.nullable()
});

export type UpdatePreferencesRequest = z.infer<typeof UpdatePreferencesRequestSchema>;
