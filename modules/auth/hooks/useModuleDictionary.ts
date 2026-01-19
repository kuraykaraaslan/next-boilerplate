'use client';

import { useMemo } from 'react';
import { getDictionary, interpolate, AuthLocale, AuthDictionary } from '../dictionaries';

export function useModuleDictionary(locale: AuthLocale = 'en') {
  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const t = useMemo(() => {
    return (key: keyof AuthDictionary, values?: Record<string, string>) => {
      const template = dictionary[key];
      if (!template) return key;
      return values ? interpolate(template, values) : template;
    };
  }, [dictionary]);

  return { t, dictionary };
}
