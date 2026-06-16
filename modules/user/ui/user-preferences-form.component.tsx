'use client';
import { useState } from 'react';
import { Toggle } from '@nb/common/ui/toggle.component';
import { Button } from '@nb/common/ui/button.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { Select } from '@nb/common/ui/select.component';
import { Input } from '@nb/common/ui/input.component';
import type { UserPreferences } from '@nb/user_preferences/server/user_preferences.types';

export type UserPreferencesValues = UserPreferences;

// Values are ISO 639-1 codes, matching @/modules/common LanguageCode (the single
// source of truth validated by the user_preferences DTO).
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

const THEME_OPTIONS = [
  { value: 'LIGHT', label: 'Light' },
  { value: 'DARK', label: 'Dark' },
  { value: 'SYSTEM', label: 'System' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'DD_MM_YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM_DD_YYYY', label: 'MM/DD/YYYY' },
];

const TIME_FORMAT_OPTIONS = [
  { value: 'H24', label: '24-hour' },
  { value: 'H12', label: '12-hour (AM/PM)' },
];

const FIRST_DAY_OPTIONS = [
  { value: 'MON', label: 'Monday' },
  { value: 'SUN', label: 'Sunday' },
];

const DEFAULTS: UserPreferencesValues = {
  theme: 'LIGHT',
  language: 'en',
  currency: 'USD',
  numberFormat: 'DOT_COMMA',
  measurementSystem: 'METRIC',
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: false,
  newsletter: true,
  productUpdates: true,
  promotionalOffers: false,
  newsletterConsentAt: null,
  marketingConsentAt: null,
  schemaVersion: 2,
  timezone: 'UTC',
  dateFormat: 'DD_MM_YYYY',
  timeFormat: 'H24',
  firstDayOfWeek: 'MON',
};

export function UserPreferencesForm({
  initial = {},
  onSubmit,
  error,
  className,
}: {
  initial?: Partial<UserPreferencesValues>;
  onSubmit: (values: UserPreferencesValues) => Promise<void> | void;
  error?: string;
  className?: string;
}) {
  const [values, setValues] = useState<UserPreferencesValues>({
    ...DEFAULTS,
    ...initial,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onSubmit(values); } finally { setLoading(false); }
  }

  function setField<K extends keyof UserPreferencesValues>(key: K, val: UserPreferencesValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-6">
        {error && <AlertBanner variant="error" message={error} />}

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Appearance & Locale</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="theme"
              label="Theme"
              options={THEME_OPTIONS}
              value={values.theme}
              onChange={(e) => setField('theme', e.target.value as UserPreferencesValues['theme'])}
            />
            <Select
              id="language"
              label="Language"
              options={LANGUAGE_OPTIONS}
              value={values.language}
              onChange={(e) => setField('language', e.target.value as UserPreferencesValues['language'])}
            />
            <Input
              id="timezone"
              label="Timezone"
              type="text"
              value={values.timezone}
              onChange={(e) => setField('timezone', e.target.value)}
              placeholder="e.g. Europe/Istanbul"
            />
            <Select
              id="date-format"
              label="Date Format"
              options={DATE_FORMAT_OPTIONS}
              value={values.dateFormat}
              onChange={(e) => setField('dateFormat', e.target.value as UserPreferencesValues['dateFormat'])}
            />
            <Select
              id="time-format"
              label="Time Format"
              options={TIME_FORMAT_OPTIONS}
              value={values.timeFormat}
              onChange={(e) => setField('timeFormat', e.target.value as UserPreferencesValues['timeFormat'])}
            />
            <Select
              id="first-day"
              label="First Day of Week"
              options={FIRST_DAY_OPTIONS}
              value={values.firstDayOfWeek}
              onChange={(e) => setField('firstDayOfWeek', e.target.value as UserPreferencesValues['firstDayOfWeek'])}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-border">
          <h3 className="text-sm font-semibold text-text-primary pt-2">Notifications</h3>
          <Toggle
            id="email-notifications"
            label="Email notifications"
            description="Receive updates and alerts via email."
            checked={values.emailNotifications}
            onChange={(checked) => setField('emailNotifications', checked)}
          />
          <Toggle
            id="sms-notifications"
            label="SMS notifications"
            description="Receive alerts via text message."
            checked={values.smsNotifications}
            onChange={(checked) => setField('smsNotifications', checked)}
          />
          <Toggle
            id="push-notifications"
            label="Push notifications"
            description="Receive in-browser push notifications."
            checked={values.pushNotifications}
            onChange={(checked) => setField('pushNotifications', checked)}
          />
          <Toggle
            id="newsletter"
            label="Newsletter"
            description="Receive our monthly product newsletter."
            checked={values.newsletter}
            onChange={(checked) => setField('newsletter', checked)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={loading}>Save Preferences</Button>
        </div>
      </div>
    </form>
  );
}
