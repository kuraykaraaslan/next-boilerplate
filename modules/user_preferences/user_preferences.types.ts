import { z } from 'zod';
import {
  ThemeEnum,
  LanguageEnum,
  DateFormatEnum,
  TimeFormatEnum,
  FirstDayOfWeekEnum
} from './user_preferences.enums';

export const UserPreferencesSchema = z.object({
  theme: ThemeEnum.default('SYSTEM'),
  language: LanguageEnum.default('EN'),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
  newsletter: z.boolean().default(true),
  timezone: z.string().default('UTC'),
  dateFormat: DateFormatEnum.default('DD/MM/YYYY'),
  timeFormat: TimeFormatEnum.default('24H'),
  firstDayOfWeek: FirstDayOfWeekEnum.default('MON')
});

export const UserPreferencesDefault: UserPreferences = {
  theme: 'SYSTEM',
  language: 'EN',
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  newsletter: true,
  timezone: 'UTC',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24H',
  firstDayOfWeek: 'MON'
};

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
