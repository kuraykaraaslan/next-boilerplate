# user_profile module

User profile information: name, biography, profile picture, header image, and platform-based social links.

---

## Files

| File | Purpose |
|---|---|
| `user_profile.service.ts` | Core: get, create, update |
| `user_profile.types.ts` | `UserProfile`, `SocialLinkItem` |
| `user_profile.dto.ts` | Zod DTOs |
| `user_profile.enums.ts` | `SocialPlatform` enum |
| `entities/user_profile.entity.ts` | TypeORM entity |

---

## Social Platforms

`github` · `twitter` · `linkedin` · `instagram` · `facebook` · `youtube` · `website` · `dribbble` · `behance`

---

## Types

```typescript
type SocialLinkItem = {
  id: string;
  platform: SocialPlatform;
  url: string;
  order: number;
};

type UserProfile = {
  firstName: string;
  lastName: string;
  biography?: string;
  profilePicture?: string;   // URL
  headerImage?: string;      // URL
  socialLinks: SocialLinkItem[];
};
```

---

## Usage

```typescript
import UserProfileService from '@/modules/user_profile/user_profile.service';

// Get (creates empty profile if missing)
const profile = await UserProfileService.getOrCreate(userId);

// Update
await UserProfileService.update(userId, {
  firstName: 'Alice',
  biography: 'Software engineer at Acme.',
  socialLinks: [
    { platform: 'github', url: 'https://github.com/alice', order: 0 },
  ],
});
```

---

## API Routes

```
GET /api/user/profile
PUT /api/user/profile
```

---

## Caching

`getByUserId(userId)` is cached in Redis under `user_profile:user:{userId}` (TTL = `SESSION_CACHE_TTL`, default 30 min). Null results are cached too — repeated lookups for users without a profile don't re-hit the DB. Every mutation (`create`, `update`, `upsert`, `delete`, `addSocialLink`, `removeSocialLink`, `updateSocialLink`) invalidates the key.

TTL is jittered ±10% and reads are wrapped in in-process single-flight.
