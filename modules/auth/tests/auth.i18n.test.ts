import { describe, it, expect } from 'vitest';
import { resolveLocale, translateAuthMessage, authEmailSubject } from '../auth.i18n';
import AuthMessages from '../auth.messages';

describe('resolveLocale (GTH-11)', () => {
  it('defaults to en when header is missing', () => {
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('')).toBe('en');
  });
  it('picks the first supported locale from Accept-Language', () => {
    expect(resolveLocale('tr-TR,tr;q=0.9,en;q=0.8')).toBe('tr');
    expect(resolveLocale('fr-FR,es;q=0.7')).toBe('es');
  });
  it('falls back to en for unsupported locales', () => {
    expect(resolveLocale('de-DE,fr;q=0.9')).toBe('en');
  });
});

describe('translateAuthMessage (GTH-10/11)', () => {
  it('translates a known key per locale', () => {
    expect(translateAuthMessage(AuthMessages.INVALID_EMAIL_OR_PASSWORD, 'tr')).toMatch(/şifre/i);
    expect(translateAuthMessage(AuthMessages.INVALID_EMAIL_OR_PASSWORD, 'es')).toMatch(/contraseña/i);
  });
  it('falls back to English then to the raw key', () => {
    expect(translateAuthMessage(AuthMessages.REGISTRATION_DISABLED, 'en')).toMatch(/disabled/i);
    expect(translateAuthMessage('NO_SUCH_KEY', 'tr')).toBe('NO_SUCH_KEY');
  });
});

describe('authEmailSubject (GTH-10)', () => {
  it('returns localized subjects', () => {
    expect(authEmailSubject('otp', 'en')).toMatch(/verification/i);
    expect(authEmailSubject('otp', 'tr')).toMatch(/Doğrulama/i);
    expect(authEmailSubject('forgot_password', 'es')).toMatch(/contraseña/i);
  });
});
