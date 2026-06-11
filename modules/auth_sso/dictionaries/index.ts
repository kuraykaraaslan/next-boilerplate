import en from './en.json';
import tr from './tr.json';
import es from './es.json';

export type SSOLocale = 'en' | 'tr' | 'es';
export type SSODictionary = typeof en;

const dictionaries: Record<SSOLocale, SSODictionary> = {
  en,
  tr,
  es
};

export function getDictionary(locale: SSOLocale = 'en'): SSODictionary {
  return dictionaries[locale] || dictionaries.en;
}

export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || '');
}

const SUPPORTED_LOCALES: SSOLocale[] = ['en', 'tr', 'es'];

/** Normalise an Accept-Language / locale string to a supported SSO locale. */
export function resolveLocale(input: string | null | undefined): SSOLocale {
  if (!input) return 'en';
  const primary = input.split(',')[0]?.trim().toLowerCase().split('-')[0];
  return (SUPPORTED_LOCALES as string[]).includes(primary ?? '') ? (primary as SSOLocale) : 'en';
}

/**
 * GOODTOHAVE (i18n): localise a service-layer SSO error key for the API.
 * Falls back to the raw key when no translation exists so callers always get a
 * non-empty, stable string.
 */
export function localizeError(key: string, locale: SSOLocale | string | null | undefined): string {
  const resolved = typeof locale === 'string' ? resolveLocale(locale) : (locale ?? 'en');
  const dict = getDictionary(resolved) as SSODictionary & { errors?: Record<string, string> };
  return dict.errors?.[key] ?? (getDictionary('en') as typeof dict).errors?.[key] ?? key;
}
