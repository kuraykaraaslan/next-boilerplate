import { z } from 'zod';
import { languages } from 'countries-list';
import tags from 'language-tags';

/**
 * Locale & language primitives for a multi-country SaaS — library-sourced, not
 * hand-maintained:
 *  - Languages (ISO 639-1) come from the `countries-list` package.
 *  - BCP-47 locale strings (`tr-TR`, `pt-BR`) are validated against the IANA
 *    language-subtag registry via the `language-tags` package.
 */

// ── Languages (ISO 639-1, from countries-list) ─────────────────────────────
type RawLanguage = { name: string; native: string };

const LANGUAGE_DATA = languages as unknown as Record<string, RawLanguage>;
const LANGUAGE_CODES = Object.keys(LANGUAGE_DATA) as [string, ...string[]];

export const LanguageCodeEnum = z.enum(LANGUAGE_CODES);
export type LanguageCode = z.infer<typeof LanguageCodeEnum>;

export const LANGUAGES: { code: LanguageCode; name: string; native: string }[] =
  Object.entries(LANGUAGE_DATA).map(([code, l]) => ({
    code: code as LanguageCode,
    name: l.name,
    native: l.native,
  }));

/** True if `v` is a known ISO 639-1 language code. */
export function isLanguageCode(v: string): v is LanguageCode {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_DATA, v);
}

// ── BCP-47 locales (validated via language-tags) ───────────────────────────
/** A BCP-47 locale string, e.g. `en-US`, `tr-TR`, or a bare language `tr`. */
export type LocaleCode = string;

export const DEFAULT_LOCALE: LocaleCode = 'en-US';

/** True if `v` is a well-formed, registered BCP-47 language tag. */
export function isLocaleCode(v: string): boolean {
  try {
    return tags(v).valid();
  } catch {
    return false;
  }
}

/** Zod schema validating a BCP-47 locale string against the IANA registry. */
export const LocaleSchema = z
  .string()
  .refine(isLocaleCode, { message: 'Invalid BCP-47 locale' });

/**
 * Back-compat alias. Previously a fixed `z.enum`; now a registry-validated
 * string schema so any valid BCP-47 locale is accepted (no curated list).
 */
export const LocaleCodeEnum = LocaleSchema;

/**
 * Normalise arbitrary user / `Accept-Language` input into a valid locale:
 *  - canonicalise casing (`tr_tr` → `tr-TR`) and return it if registered,
 *  - else fall back to the bare language subtag (`tr`) if known,
 *  - else `null`.
 */
export function parseLocale(input?: string | null): LocaleCode | null {
  if (!input) return null;
  const trimmed = input.replace(/_/g, '-').trim();
  if (!trimmed) return null;

  const [langRaw, regionRaw] = trimmed.split('-');
  const lang = langRaw.toLowerCase();
  const canonical = regionRaw ? `${lang}-${regionRaw.toUpperCase()}` : lang;

  if (isLocaleCode(canonical)) return canonical;
  if (isLanguageCode(lang)) return lang;
  return null;
}

/**
 * Display list for language dropdowns — derived from the library language data.
 * (`LOCALES` name kept for back-compat; entries are ISO 639-1 languages.)
 */
export const LOCALES: { code: LanguageCode; label: string; nativeLabel: string }[] =
  LANGUAGES.map((l) => ({ code: l.code, label: l.name, nativeLabel: l.native }));
