import en from './en.json';
import tr from './tr.json';
import es from './es.json';

export type TenantLocale = 'en' | 'tr' | 'es';
export type TenantDictionary = typeof en;

const dictionaries: Record<TenantLocale, TenantDictionary> = {
  en,
  tr,
  es
};

export function getDictionary(locale: TenantLocale = 'en'): TenantDictionary {
  return dictionaries[locale] || dictionaries.en;
}

export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || '');
}
