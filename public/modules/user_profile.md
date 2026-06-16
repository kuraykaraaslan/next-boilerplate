# User Profile

- **id:** `user_profile`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/user_profile/`
- **tags:** identity
- **icon:** `fas fa-id-card`
- **hasNextLayer:** false

Profile fields (avatar, bio, locale, timezone) — separated from the user entity for read scalability.

## Dependencies

- **requires:** `db`, `user`

## TypeORM entities

- `UserProfile` (system) — `modules/user_profile/server/entities/user_profile.entity.ts`

## README

# User Profile Module

User profile information — display name, biography, profile picture, header image, and platform-based social links. Profiles are keyed solely on the cross-module `userId` and are shared system-wide (no tenant scoping). Separated from the `user` entity for read scalability.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `UserProfile` | `user_profiles` | One profile row per user, keyed by a unique `userId` (uuid). Holds `name`, `biography`, `profilePicture`, `headerImage`, and a `socialLinks` jsonb array. |

The table lives in the **system DB** — `UserProfile` has no `tenantId` column.

---

## Service / Responsibilities

`UserProfileService` (default export, all methods static) is the only service:

| Method | Responsibility |
|---|---|
| `getByUserId(userId)` | Read a profile (cached). Returns `null` when none exists. |
| `create(userId, data?)` | Create a profile; throws if one already exists for the user. |
| `update(userId, data)` | Update fields of an existing profile; throws if not found. |
| `upsert(userId, data)` | Update if present, otherwise create. |
| `delete(userId)` | Delete the profile; throws if not found. |
| `addSocialLink(userId, link)` | Append a `SocialLinkItem` to `socialLinks`. |
| `removeSocialLink(userId, linkId)` | Remove a link by its `id`. |
| `updateSocialLink(userId, linkId, data)` | Patch a single link by its `id`. |

All mutations re-validate the row against `UserProfileSchema` before returning and invalidate the Redis cache.

---

## Files

| File | Purpose |
|---|---|
| `user_profile.service.ts` | `UserProfileService` — CRUD, social-link helpers, caching |
| `user_profile.types.ts` | `UserProfile`, `SocialLinkItem` types + Zod schemas + `UserProfileDefault` |
| `user_profile.dto.ts` | Request DTOs (`UpdateProfileRequestSchema`, `UpdateSocialLinkItemSchema`) |
| `user_profile.enums.ts` | `SocialLinkPlatformEnum` (Zod enum) + `SocialLinkPlatform` type |
| `entities/user_profile.entity.ts` | TypeORM entity (`user_profiles`) |
| `user_profile.seed.ts` | System-scoped demo seed (user / admin / guest personas) |

---

## Social Platforms

`SocialLinkPlatformEnum` values (UPPERCASE), grouped:

- **Developer:** `GITHUB` · `GITLAB` · `BITBUCKET` · `STACKOVERFLOW` · `NPM` · `PYPI`
- **Blogging & writing:** `DEVTO` · `MEDIUM` · `HASHNODE` · `SUBSTACK`
- **Professional & career:** `LINKEDIN` · `WEBSITE` · `EMAIL` · `CALENDLY`
- **Social media:** `TWITTER` · `FACEBOOK` · `INSTAGRAM` · `YOUTUBE` · `TIKTOK` · `SNAPCHAT` · `REDDIT` · `PINTEREST`
- **Community & messaging:** `DISCORD` · `SLACK` · `TELEGRAM` · `KEYBASE` · `DISCOURSE`
- **Freelance / consulting:** `UPWORK` · `FREELANCER` · `FIVERR` · `TOPTAL`
- **Frontend / playground:** `CODEPEN` · `JSFIDDLE`
- **Competitive / learning:** `LEETCODE` · `HACKERRANK` · `KAGGLE`

---

## Types

```typescript
type SocialLinkItem = {
  id: string;                    // uuid
  platform: SocialLinkPlatform;  // SocialLinkPlatformEnum value, e.g. 'GITHUB'
  url: string | null;            // valid URL or null
  order: number;                 // non-negative integer
};

type UserProfile = {
  name: string | null;
  biography: string | null;
  profilePicture: string | null; // URL
  headerImage: string | null;    // URL
  socialLinks: SocialLinkItem[];  // defaults to []
};
```

---

## Usage

```typescript
import UserProfileService from '@/modules/user_profile/user_profile.service';

// Read (returns null if the user has no profile yet)
const profile = await UserProfileService.getByUserId(userId);

// Create-or-update in one call
await UserProfileService.upsert(userId, {
  name: 'Alice',
  biography: 'Software engineer at Acme.',
  socialLinks: [
    { id: crypto.randomUUID(), platform: 'GITHUB', url: 'https://github.com/alice', order: 0 },
  ],
});
```

---

## API Routes

Tenant-scoped and authenticated — the handler resolves the caller via the tenant session and operates only on `user.userId`. Rate-limited via `Limiter.checkRateLimit`.

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/auth/me/profile` | Return the current user's profile (`UserProfileService.getByUserId`) |
| PUT | `/tenant/[tenantId]/api/auth/me/profile` | Update the current user's profile; body validated by `UpdateProfileRequestSchema` |

---

## Caching

`getByUserId(userId)` is cached in Redis under `user_profile:user:{userId}` (TTL = `SESSION_CACHE_TTL`, default 5 min). Null results are cached too — repeated lookups for users without a profile don't re-hit the DB. Every mutation (`create`, `update`, `upsert`, `delete`, `addSocialLink`, `removeSocialLink`, `updateSocialLink`) invalidates the key via `clearCache`.

TTL is jittered (`jitter`) and DB reads are wrapped in in-process single-flight (`singleFlight`). Cached payloads are re-parsed through `UserProfileSchema`; a malformed cache entry is dropped and re-fetched.

---

## Settings

This module has **no settings** (no `*.setting.keys.ts` / `*.settings.fields.ts`) — there is nothing to configure per tenant or system-wide.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — Manages user profile data (name, biography, profile pictures, social links) keyed solely by cross-module userId with no tenant scoping; system-wide shared profiles across all tenants.

---

## Dependencies

- `db` — system data source / TypeORM repository
- `user` — supplies the cross-module `userId`
- `redis` — caching (`get`/`setex`/`del`, `jitter`, `singleFlight`)
- `env` — `SESSION_CACHE_TTL`
