# Tenant modülleri — Type duplikasyon raporu

## tenant_member

### Duplikasyon: `MemberRole` enum
- **Canonical kaynak:** `modules/tenant_member/tenant_member.enums.ts:3-7` — `TenantMemberRoleEnum` / `TenantMemberRole`
- **Duplike yerler (6 yer):**
  - `app/tenant/[tenantId]/admin/(sysadmin-scope)/users/page.tsx:29`
  - `app/tenant/[tenantId]/admin/(sysadmin-scope)/users/[userId]/page.tsx:25`
  - `app/tenant/[tenantId]/admin/(sysadmin-scope)/tenants/[targetTenantId]/page.tsx:24`
  - `app/tenant/[tenantId]/admin/(tenant-scope)/members/page.tsx:18`
  - `app/tenant/[tenantId]/admin/(tenant-scope)/invitations/page.tsx:17`
  - `app/tenant/[tenantId]/admin/(tenant-scope)/domains/page.tsx:17`
- **Önerilen unify:** `import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums'`
- **Risk:** **Düşük** — değerler %100 eşleşiyor.

### Duplikasyon: `MemberStatus` enum
- **Canonical kaynak:** `modules/tenant_member/tenant_member.enums.ts:9-14` — `TenantMemberStatusEnum`
- **Duplike yerler (3 yer):** sysadmin users/tenants page'lerinde inline union
- **Önerilen unify:** `import type { TenantMemberStatus } from '@/modules/tenant_member/tenant_member.enums'`
- **Risk:** **Düşük** — %100 örtüşüyor.

### Duplikasyon: `Member` object tipi
- **Canonical kaynak:** `modules/tenant_member/tenant_member.types.ts:6-29` — `SafeTenantMember`
- **Duplike yerler (3+ yer):**
  - `app/tenant/[tenantId]/admin/(tenant-scope)/members/page.tsx:20-26`
  - `app/tenant/[tenantId]/admin/(sysadmin-scope)/tenants/[targetTenantId]/page.tsx:35-42`
- **Önerilen unify:** `import type { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types'`
- **Risk:** **Orta** — bazı page'ler joined `user?` field içeriyor; gerekirse `type Member = SafeTenantMember & { user?: SafeUser }`.

---

## tenant

### Duplikasyon: `TenantStatus` enum
- **Canonical kaynak:** `modules/tenant/tenant.enums.ts:3-10` — `TenantStatusEnum`
- **Duplike yerler (4 yer):** sysadmin scope altındaki tenants/users page'leri
- **Önerilen unify:** `import type { TenantStatus } from '@/modules/tenant/tenant.enums'`
- **Risk:** **Düşük** — %100 örtüşüyor.

---

## tenant_invitation

### Duplikasyon: `InvitationStatus` enum + `Invitation` object
- **Canonical kaynak:**
  - `modules/tenant_invitation/tenant_invitation.enums.ts:3-9` — `TenantInvitationStatusEnum`
  - `modules/tenant_invitation/tenant_invitation.types.ts:5-23` — `SafeTenantInvitation`
- **Duplike yerler:**
  - `app/.../invitations/page.tsx:19` — `type InvitationStatus`
  - `app/.../invitations/page.tsx:21-31` — `type Invitation`
- **Önerilen unify:** Her ikisi de canonical export'tan import edilmeli.
- **Risk:** **Düşük** — alan adları birebir.

---

## tenant_domain

### Duplikasyon: `DomainStatus`, `SslStatus`, `Domain` tipleri
- **Canonical kaynak:** `modules/tenant_domain/tenant_domain.enums.ts:3-9` (`DomainStatusEnum`), `:19-27` (`SslStatusEnum`); `modules/tenant_domain/tenant_domain.types.ts` (`SafeTenantDomain`)
- **Duplike yerler:**
  - `app/.../domains/page.tsx:19-36` — `DomainStatus`, `SslStatus`, `Domain` (tenant-scope, %100 overlap)
  - `app/.../sysadmin-scope/tenants/[targetTenantId]/page.tsx:23,27-33` — `DomainStatus` (eksik `DNS_FAILED`!), `Domain` (35% subset)
- **Önerilen unify:**
  - tenant-scope: `import { type DomainStatus, type SslStatus } from '@/modules/tenant_domain/tenant_domain.enums'` ve `type Domain = SafeTenantDomain`
  - sysadmin-scope: `type DomainBasic = Pick<SafeTenantDomain, 'tenantDomainId' | 'domain' | 'isPrimary' | 'domainStatus' | 'createdAt'>`
- **Risk:** **Orta** — sysadmin page `DNS_FAILED` değerini desteklemiyor; unify sırasında bu farkı gözden geçir.

---

## tenant_session, tenant_subscription, tenant_branding, tenant_export, tenant_usage

### ✅ Temiz
- Bu modüllerin admin page'leri yok ya da canonical type'ları doğru import ediyor.
- `tenant_subscription` plan tipleri için `modules/tenant_subscription/tenant_subscription.types.ts` zaten kullanılıyor.

---

## Özet

| Tip | Duplike Yer | Risk | Eylem |
|-----|------------|------|-------|
| `MemberRole` | 6 | Düşük | enums.ts import |
| `TenantStatus` | 4 | Düşük | enums.ts import |
| `MemberStatus` | 3 | Düşük | enums.ts import |
| `DomainStatus` | 2 | Orta | enums.ts import + `DNS_FAILED` farkı |
| `SslStatus` | 1 | Düşük | enums.ts import |
| `InvitationStatus` | 1 | Düşük | enums.ts import |
| `Member` | 3+ | Orta | `SafeTenantMember` reuse |
| `Invitation` | 1 | Düşük | `SafeTenantInvitation` reuse |
| `Domain` | 2 | Orta | tam vs subset ayrımı |

**Toplam:** ~23 duplikasyon. En kirli modül: **tenant_member** (`MemberRole` 6 yerde redefine).

### Faz Planı
1. **Faz 1 (kolay, düşük risk):** Tüm enum union'ları → `*.enums.ts` import (4 enum × 16 yer)
2. **Faz 2 (orta, ViewModel dikkat):** `Member`, `Invitation`, `Domain` object'leri canonical Safe* tipleriyle değiştir
3. **Faz 3 (koordinasyon):** sysadmin page'inde `DomainStatus`'taki `DNS_FAILED` eksikliği — UI'da gösterilip gösterilmeyeceğine karar ver

---

*Scope: `tenant`, `tenant_member`, `tenant_invitation`, `tenant_domain`, `tenant_session`, `tenant_subscription`, `tenant_branding`, `tenant_export`, `tenant_usage`*
