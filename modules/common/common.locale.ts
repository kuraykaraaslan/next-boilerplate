import { z } from 'zod';

/**
 * Canonical BCP-47 locale primitive for a multi-country SaaS.
 *
 * Dependency-free: no DB, no env, no next/react. Curated to the locales the
 * platform actually serves (major markets) rather than the full CLDR set, so
 * the union stays meaningful for validation and dropdowns. Every downstream
 * module (notifications, invoices, dynamic pages) must spell locales the same
 * way — this is the single source of truth.
 */
export const LocaleCodeEnum = z.enum([
  'en-US',
  'en-GB',
  'tr-TR',
  'de-DE',
  'fr-FR',
  'fr-CA',
  'es-ES',
  'es-MX',
  'es-AR',
  'pt-BR',
  'pt-PT',
  'it-IT',
  'nl-NL',
  'pl-PL',
  'ru-RU',
  'ar-SA',
  'ar-AE',
  'he-IL',
  'fa-IR',
  'ja-JP',
  'ko-KR',
  'zh-CN',
  'zh-TW',
  'zh-HK',
  'hi-IN',
  'bn-IN',
  'id-ID',
  'ms-MY',
  'th-TH',
  'vi-VN',
  'sv-SE',
  'nb-NO',
  'da-DK',
  'fi-FI',
  'is-IS',
  'cs-CZ',
  'sk-SK',
  'hu-HU',
  'ro-RO',
  'bg-BG',
  'hr-HR',
  'sr-RS',
  'sl-SI',
  'el-GR',
  'uk-UA',
  'et-EE',
  'lv-LV',
  'lt-LT',
]);

export type LocaleCode = z.infer<typeof LocaleCodeEnum>;

export const DEFAULT_LOCALE: LocaleCode = 'en-US';

/**
 * Display metadata for each supported locale: English label plus the locale's
 * own native rendering. Order matches `LocaleCodeEnum` for stable dropdowns.
 */
export const LOCALES: { code: LocaleCode; label: string; nativeLabel: string }[] = [
  { code: 'en-US', label: 'English (United States)', nativeLabel: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)', nativeLabel: 'English (United Kingdom)' },
  { code: 'tr-TR', label: 'Turkish (Turkey)', nativeLabel: 'Türkçe (Türkiye)' },
  { code: 'de-DE', label: 'German (Germany)', nativeLabel: 'Deutsch (Deutschland)' },
  { code: 'fr-FR', label: 'French (France)', nativeLabel: 'Français (France)' },
  { code: 'fr-CA', label: 'French (Canada)', nativeLabel: 'Français (Canada)' },
  { code: 'es-ES', label: 'Spanish (Spain)', nativeLabel: 'Español (España)' },
  { code: 'es-MX', label: 'Spanish (Mexico)', nativeLabel: 'Español (México)' },
  { code: 'es-AR', label: 'Spanish (Argentina)', nativeLabel: 'Español (Argentina)' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', nativeLabel: 'Português (Brasil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)', nativeLabel: 'Português (Portugal)' },
  { code: 'it-IT', label: 'Italian (Italy)', nativeLabel: 'Italiano (Italia)' },
  { code: 'nl-NL', label: 'Dutch (Netherlands)', nativeLabel: 'Nederlands (Nederland)' },
  { code: 'pl-PL', label: 'Polish (Poland)', nativeLabel: 'Polski (Polska)' },
  { code: 'ru-RU', label: 'Russian (Russia)', nativeLabel: 'Русский (Россия)' },
  { code: 'ar-SA', label: 'Arabic (Saudi Arabia)', nativeLabel: 'العربية (السعودية)' },
  { code: 'ar-AE', label: 'Arabic (United Arab Emirates)', nativeLabel: 'العربية (الإمارات)' },
  { code: 'he-IL', label: 'Hebrew (Israel)', nativeLabel: 'עברית (ישראל)' },
  { code: 'fa-IR', label: 'Persian (Iran)', nativeLabel: 'فارسی (ایران)' },
  { code: 'ja-JP', label: 'Japanese (Japan)', nativeLabel: '日本語 (日本)' },
  { code: 'ko-KR', label: 'Korean (South Korea)', nativeLabel: '한국어 (대한민국)' },
  { code: 'zh-CN', label: 'Chinese (Simplified, China)', nativeLabel: '中文 (中国)' },
  { code: 'zh-TW', label: 'Chinese (Traditional, Taiwan)', nativeLabel: '中文 (台灣)' },
  { code: 'zh-HK', label: 'Chinese (Traditional, Hong Kong)', nativeLabel: '中文 (香港)' },
  { code: 'hi-IN', label: 'Hindi (India)', nativeLabel: 'हिन्दी (भारत)' },
  { code: 'bn-IN', label: 'Bengali (India)', nativeLabel: 'বাংলা (ভারত)' },
  { code: 'id-ID', label: 'Indonesian (Indonesia)', nativeLabel: 'Indonesia (Indonesia)' },
  { code: 'ms-MY', label: 'Malay (Malaysia)', nativeLabel: 'Melayu (Malaysia)' },
  { code: 'th-TH', label: 'Thai (Thailand)', nativeLabel: 'ไทย (ไทย)' },
  { code: 'vi-VN', label: 'Vietnamese (Vietnam)', nativeLabel: 'Tiếng Việt (Việt Nam)' },
  { code: 'sv-SE', label: 'Swedish (Sweden)', nativeLabel: 'Svenska (Sverige)' },
  { code: 'nb-NO', label: 'Norwegian Bokmål (Norway)', nativeLabel: 'Norsk bokmål (Norge)' },
  { code: 'da-DK', label: 'Danish (Denmark)', nativeLabel: 'Dansk (Danmark)' },
  { code: 'fi-FI', label: 'Finnish (Finland)', nativeLabel: 'Suomi (Suomi)' },
  { code: 'is-IS', label: 'Icelandic (Iceland)', nativeLabel: 'Íslenska (Ísland)' },
  { code: 'cs-CZ', label: 'Czech (Czechia)', nativeLabel: 'Čeština (Česko)' },
  { code: 'sk-SK', label: 'Slovak (Slovakia)', nativeLabel: 'Slovenčina (Slovensko)' },
  { code: 'hu-HU', label: 'Hungarian (Hungary)', nativeLabel: 'Magyar (Magyarország)' },
  { code: 'ro-RO', label: 'Romanian (Romania)', nativeLabel: 'Română (România)' },
  { code: 'bg-BG', label: 'Bulgarian (Bulgaria)', nativeLabel: 'Български (България)' },
  { code: 'hr-HR', label: 'Croatian (Croatia)', nativeLabel: 'Hrvatski (Hrvatska)' },
  { code: 'sr-RS', label: 'Serbian (Serbia)', nativeLabel: 'Српски (Србија)' },
  { code: 'sl-SI', label: 'Slovenian (Slovenia)', nativeLabel: 'Slovenščina (Slovenija)' },
  { code: 'el-GR', label: 'Greek (Greece)', nativeLabel: 'Ελληνικά (Ελλάδα)' },
  { code: 'uk-UA', label: 'Ukrainian (Ukraine)', nativeLabel: 'Українська (Україна)' },
  { code: 'et-EE', label: 'Estonian (Estonia)', nativeLabel: 'Eesti (Eesti)' },
  { code: 'lv-LV', label: 'Latvian (Latvia)', nativeLabel: 'Latviešu (Latvija)' },
  { code: 'lt-LT', label: 'Lithuanian (Lithuania)', nativeLabel: 'Lietuvių (Lietuva)' },
];

const LOCALE_SET: ReadonlySet<string> = new Set(LocaleCodeEnum.options);

/** True if `v` is one of the supported BCP-47 locale codes (exact match). */
export function isLocaleCode(v: string): v is LocaleCode {
  return LOCALE_SET.has(v);
}

/**
 * Normalise arbitrary user/header input into a supported `LocaleCode`.
 *
 * - Exact supported code (case-insensitive on the region) → that code.
 * - A bare language tag (`tr`, `de`, `pt`) → best matching regional locale
 *   (first supported locale whose language part matches).
 * - Anything unrecognised → `null`.
 */
export function parseLocale(input?: string | null): LocaleCode | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Normalise to BCP-47 casing: lang lowercase, region uppercase.
  const [langRaw, regionRaw] = trimmed.replace(/_/g, '-').split('-');
  const lang = langRaw.toLowerCase();
  const canonical = regionRaw ? `${lang}-${regionRaw.toUpperCase()}` : lang;

  if (regionRaw && isLocaleCode(canonical)) return canonical;

  // Bare language (or unmatched region): pick the first supported locale that
  // shares the language part. `tr` → `tr-TR`, `en` → `en-US`.
  const match = LocaleCodeEnum.options.find((code) => code.split('-')[0] === lang);
  return match ?? null;
}
