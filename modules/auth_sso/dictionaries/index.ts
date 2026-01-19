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
