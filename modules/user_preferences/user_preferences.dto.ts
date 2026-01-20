import { z } from 'zod';
import {
  ThemeEnum,
  LanguageEnum,
  DateFormatEnum,
  TimeFormatEnum,
  FirstDayOfWeekEnum
} from './user_preferences.enums';

export const UpdatePreferencesRequestSchema = z.object({
  theme: ThemeEnum.optional(),
  language: LanguageEnum.optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  timezone: z.string().optional(),
  dateFormat: DateFormatEnum.optional(),
  timeFormat: TimeFormatEnum.optional(),
  firstDayOfWeek: FirstDayOfWeekEnum.optional()
});

export type UpdatePreferencesRequest = z.infer<typeof UpdatePreferencesRequestSchema>;
