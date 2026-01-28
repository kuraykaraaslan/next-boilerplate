'use client';

import { useMemo } from 'react';
import { getDictionary, interpolate, TenantLocale, TenantDictionary } from '../dictionaries';

export function useModuleDictionary(locale: TenantLocale = 'en') {
  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const t = useMemo(() => {
    return (key: keyof TenantDictionary, values?: Record<string, string>) => {
      const template = dictionary[key];
      if (!template) return key;
      return values ? interpolate(template, values) : template;
    };
  }, [dictionary]);

  return { t, dictionary };
}
