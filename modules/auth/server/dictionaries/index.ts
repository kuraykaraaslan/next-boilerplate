import en from './en.json';
import tr from './tr.json';
import es from './es.json';

export type AuthLocale = 'en' | 'tr' | 'es';
export type AuthDictionary = typeof en;

const dictionaries: Record<AuthLocale, AuthDictionary> = {
  en,
  tr,
  es
};

export function getDictionary(locale: AuthLocale = 'en'): AuthDictionary {
  return dictionaries[locale] || dictionaries.en;
}

export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || '');
}
