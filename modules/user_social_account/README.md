# user_social_account module

External OAuth account linking. Links and unlinks social provider accounts, manages access/refresh tokens, and prevents duplicate account linking across users.

---

## Files

| File | Purpose |
|---|---|
| `user_social_account.service.ts` | Core: link, unlink, get, list |
| `user_social_account.types.ts` | `UserSocialAccount`, `SafeUserSocialAccount` |
| `user_social_account.enums.ts` | `SocialProvider` enum |
| `user_social_account.messages.ts` | Error/success message strings |
| `entities/user_social_account.entity.ts` | TypeORM entity |

---

## Supported Providers

`google` · `github` · `microsoft` · `apple` · `facebook` · `linkedin` · `slack` · `tiktok` · `twitter` · `wechat` · `autodesk`

---

## SafeUserSocialAccount vs UserSocialAccount

`UserSocialAccount` includes raw access and refresh tokens — never serialize these in API responses. `SafeUserSocialAccount` omits them.

---

## Usage

```typescript
import UserSocialAccountService from '@/modules/user_social_account/user_social_account.service';

// Link after successful OAuth callback
await UserSocialAccountService.link(userId, {
  provider: 'github',
  providerId: '12345',
  accessToken: 'gho_xxx',
  refreshToken: 'ghr_xxx',
  profilePicture: 'https://avatars.githubusercontent.com/u/12345',
});

// Get all linked accounts
const accounts = await UserSocialAccountService.listByUser(userId);
// Returns SafeUserSocialAccount[]

// Unlink
await UserSocialAccountService.unlink(userId, 'github');
```

---

## Duplicate Prevention

If another user has already linked the same provider + provider ID, `link()` throws an error. A provider account can only be linked to one user at a time.

---

## API Routes

```
GET    /api/user/social-accounts
DELETE /api/user/social-accounts/[provider]
```

Linking happens automatically through the SSO callback — see `auth_sso` module.
