import AuthMessages from './auth.messages';
import { getDictionary, type AuthLocale } from './dictionaries';

// GTH-10 / GTH-11: locale-aware resolution of auth message keys.
//
// `auth.messages.ts` carries machine-readable keys (e.g. INVALID_CREDENTIALS).
// The route/UI layer turns those into human strings. This helper resolves a key
// into the recipient's locale using the `errors` namespace of the auth
// dictionaries, falling back to English and finally the raw key.
//
// `modules/` must stay framework-free, so the Accept-Language parsing here is a
// pure string function — the Next route layer passes the header value in.

const SUPPORTED_LOCALES: AuthLocale[] = ['en', 'tr', 'es'];

/**
 * Resolve a best-match supported locale from an `Accept-Language` header value
 * (or any comma-separated locale list). Falls back to 'en'.
 */
export function resolveLocale(acceptLanguage?: string | null): AuthLocale {
  if (!acceptLanguage) return 'en';
  const candidates = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0]!.trim().toLowerCase())
    .filter(Boolean);
  for (const cand of candidates) {
    const base = cand.split('-')[0] as AuthLocale;
    if (SUPPORTED_LOCALES.includes(base)) return base;
  }
  return 'en';
}

/**
 * Translate an AuthMessages key (or any string) into the given locale using the
 * `errors` namespace of the auth dictionaries. Returns the English string, then
 * the raw key, when no translation exists.
 */
export function translateAuthMessage(key: AuthMessages | string, locale: AuthLocale = 'en'): string {
  const dict = getDictionary(locale) as Record<string, unknown>;
  const en = getDictionary('en') as Record<string, unknown>;
  const errors = (dict.errors ?? {}) as Record<string, string>;
  const enErrors = (en.errors ?? {}) as Record<string, string>;
  return errors[key] ?? enErrors[key] ?? String(key);
}

/**
 * GTH-10: localized transactional auth email subjects. Used to override the
 * default (English) subject in the notification_mail templates so users receive
 * auth mail in their own language. Returns the English subject as a fallback.
 */
export function authEmailSubject(
  key: 'otp' | 'verify_email' | 'forgot_password' | 'password_reset_success',
  locale: AuthLocale = 'en',
): string {
  const dict = getDictionary(locale) as Record<string, unknown>;
  const en = getDictionary('en') as Record<string, unknown>;
  const subjects = (dict.email_subjects ?? {}) as Record<string, string>;
  const enSubjects = (en.email_subjects ?? {}) as Record<string, string>;
  return subjects[key] ?? enSubjects[key] ?? key;
}
