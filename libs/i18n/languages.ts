import languages from '@cospired/i18n-iso-languages';
import en from '@cospired/i18n-iso-languages/langs/en.json';

languages.registerLocale(en);

/**
 * Tüm ISO-639-1 dilleri
 * label: English (Native)
 */
export const languageOptions = Object.keys(languages.getAlpha2Codes())
  .map(code => {
    const nameEn = languages.getName(code, 'en');
    const nameNative = languages.getName(code, code);

    return {
      value: code,
      label:
        nameNative && nameNative !== nameEn
          ? `${nameEn} (${nameNative})`
          : nameEn ?? code,
    };
  })
  // boş / undefined isimleri ele
  .filter(opt => Boolean(opt.label))
  // alfabetik sırala
  .sort((a, b) => a.label.localeCompare(b.label));
