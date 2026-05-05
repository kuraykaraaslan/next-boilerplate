# auth_sso module

OAuth2 SSO integration with 11 providers. Handles auth URL generation, callback processing, token management, automatic user creation/linking, and account management.

---

## Files

| File | Purpose |
|---|---|
| `auth_sso.service.ts` | Core: auth URL generation, callback handling, user linking |
| `auth_sso.types.ts` | `SSOProfile`, `SSOTokens`, `SSOProviderConfig` |
| `auth_sso.dto.ts` | `SSOCallbackDTO` |
| `auth_sso.enums.ts` | `SSOProvider` enum |
| `auth_sso.config.ts` | Per-provider OAuth config builder |
| `auth_sso.messages.ts` | Error/success message strings |
| `providers/base.provider.ts` | Abstract base class |
| `providers/google.provider.ts` | Google OAuth2 |
| `providers/github.provider.ts` | GitHub OAuth2 |
| `providers/microsoft.provider.ts` | Microsoft OAuth2 |
| `providers/apple.provider.ts` | Sign in with Apple |
| `providers/facebook.provider.ts` | Facebook Login |
| `providers/linkedin.provider.ts` | LinkedIn OAuth2 |
| `providers/slack.provider.ts` | Slack OAuth2 |
| `providers/tiktok.provider.ts` | TikTok Login |
| `providers/twitter.provider.ts` | Twitter OAuth2 |
| `providers/wechat.provider.ts` | WeChat OAuth |
| `providers/autodesk.provider.ts` | Autodesk OAuth2 |
| `dictionaries/` | Localization (EN, ES, TR) |

---

## Supported Providers

`google` · `github` · `microsoft` · `apple` · `facebook` · `linkedin` · `slack` · `tiktok` · `twitter` · `wechat` · `autodesk`

---

## Flow

```typescript
import AuthSSOService from '@/modules/auth_sso/auth_sso.service';

// 1. Generate the redirect URL
const { url, state } = await AuthSSOService.getAuthUrl('google');
// Redirect user to `url`

// 2. Handle the callback (in the OAuth callback route)
const session = await AuthSSOService.handleCallback('google', { code, state });
// Returns UserSession — user is created or linked automatically
```

---

## Adding a New Provider

1. Create `providers/<name>.provider.ts` extending `BaseSSOProvider`
2. Add the provider name to `SSOProvider` enum in `auth_sso.enums.ts`
3. Add config in `auth_sso.config.ts`
4. Register in `auth_sso.service.ts` provider map

---

## API Routes

```
GET /api/auth/sso/[provider]           — initiates OAuth flow
GET /api/auth/sso/[provider]/callback  — handles provider callback
```
