-- 008_user_preferences_language_iso639.sql
--
-- Normalise `user_preferences.language` to lowercase ISO 639-1 codes.
--
-- The module used to hardcode its own `LanguageEnum` (`EN`, `ES`, `FR`, `DE`,
-- `CN`, `JP`). It now aliases `LanguageCodeEnum` from `@/modules/common`
-- (canonical ISO 639-1, lowercase), so stored values must be migrated:
--
--   EN → en   ES → es   FR → fr   DE → de   CN → zh   JP → ja
--
-- Note `CN`/`JP` were not even valid ISO 639-1 codes; they map to `zh`/`ja`.
--
-- Idempotent: the remaps target only the legacy uppercase values, and the
-- generic lower-casing only touches rows still matching `^[A-Z]{2}$`. Re-running
-- against an already-migrated database is a no-op.

-- Special cases first (differ from a plain lower-case), before the generic pass.
UPDATE "user_preferences" SET "language" = 'zh' WHERE "language" = 'CN';
UPDATE "user_preferences" SET "language" = 'ja' WHERE "language" = 'JP';

-- Remaining legacy codes (EN/ES/FR/DE) lower-case directly to the ISO 639-1 form.
UPDATE "user_preferences" SET "language" = LOWER("language") WHERE "language" ~ '^[A-Z]{2}$';

-- Align the column default with @/modules/common DEFAULT_LANGUAGE ('en').
ALTER TABLE "user_preferences" ALTER COLUMN "language" SET DEFAULT 'en';
