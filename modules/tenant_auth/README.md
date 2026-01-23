# Tenant Authentication Service

Multi-tenant authentication and authorization service. Performs tenant membership and role verification in addition to user authentication.

## 📁 Files

- `tenant_auth.service.next.ts` - Main service
- `tenant_auth.messages.ts` - Error messages
- `tenant_auth.examples.ts` - Usage examples

## 🚀 Basic Usage

```typescript
import TenantAuthNextService from "@/modules/tenant_auth/tenant_auth.service.next";

export async function GET(request: NextRequest) {
  try {
    // Minimum USER role - tenant ID from header
    await TenantAuthNextService.authenticateTenantByRequest({ 
      request, 
      requiredTenantRole: "USER" 
    });

    const tenantId = request.tenant!.tenantId;
    const memberRole = request.tenantMember!.memberRole;
    
    // Operations...
  } catch (error) {
    // Error handling
  }
}
```

## 🎯 Key Features

### 1. **Role-Based Access Control**

Three-level role hierarchy within tenants:
- `OWNER` - Highest authority (delete tenant, change owner)
- `ADMIN` - Administrator privileges (add/remove members, settings)
- `USER` - Basic access (read, edit own data)

```typescript
// Only ADMIN and OWNER can access
await TenantAuthNextService.authenticateTenantByRequest({ 
  request, 
  requiredTenantRole: "ADMIN" 
});

// Only OWNER can access
await TenantAuthNextService.authenticateTenantByRequest({ 
  request, 
  requiredTenantRole: "OWNER" 
});
```

### 2. **Flexible Tenant ID Source**

Can extract tenant ID from various sources:

#### Header (Default)
```typescript
// From x-tenant-id header
await TenantAuthNextService.authenticateTenantByRequest({ 
  request,
  requiredTenantRole: "USER",
  tenantIdSource: "header" // default
});
```

#### Query Parameter
```typescript
// From ?tenantId=xxx
await TenantAuthNextService.authenticateTenantByRequest({ 
  request,
  requiredTenantRole: "USER",
  tenantIdSource: "query"
});
```

#### Subdomain
```typescript
// acme.yourdomain.com -> "acme"
await TenantAuthNextService.authenticateTenantByRequest({ 
  request,
  requiredTenantRole: "USER",
  tenantIdSource: "subdomain"
});
```

#### Direct (Route Params)
```typescript
// For dynamic routes like /api/tenant/[tenantId]/...
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  await TenantAuthNextService.authenticateTenantByRequest({ 
    request,
    requiredTenantRole: "USER",
    tenantId: params.tenantId // Direct tenant ID
  });
}
```

### 3. **Redis Cache**

5-minute cache for each user-tenant combination:
- Cache key: `tenant:member:${userId}:${tenantId}`
- Tenant and TenantMember information cached
- Performance optimization
- Manual clearing after updates

```typescript
// Clear cache
await TenantAuthNextService.clearTenantCache(userId, tenantId);

// Clear all tenant caches for a user
await TenantAuthNextService.clearUserTenantCaches(userId);
```

### 4. **Request Object Enrichment**

After successful authentication, these are added to the request:

```typescript
request.user          // SafeUser
request.userSession   // SafeUserSession  
request.tenant        // SafeTenant (NEW)
request.tenantMember  // SafeTenantMember (NEW)
```

## 📝 Validations

The service performs these checks:

1. ✅ **User Authentication** - Via UserSessionNextService
2. ✅ **Tenant ID Extraction** - From specified source
3. ✅ **Tenant Existence** - Does tenant exist?
4. ✅ **Tenant Status** - ACTIVE/SUSPENDED/INACTIVE check
5. ✅ **Membership** - Is user a member of tenant?
6. ✅ **Member Status** - ACTIVE/PENDING/SUSPENDED/INACTIVE check
7. ✅ **Role Authorization** - Does user have required role?

## 🔒 Error Messages

```typescript
TENANT_NOT_FOUND                    // Tenant not found
TENANT_ID_REQUIRED                  // Tenant ID is required
USER_NOT_MEMBER_OF_TENANT          // User is not a member of this tenant
TENANT_INACTIVE                     // Tenant is inactive
TENANT_SUSPENDED                    // Tenant is suspended
MEMBER_INACTIVE                     // Membership is inactive
MEMBER_SUSPENDED                    // Membership is suspended
MEMBER_PENDING                      // Membership is pending approval
INSUFFICIENT_TENANT_PERMISSIONS     // Insufficient permissions
INVALID_TENANT_ID_SOURCE           // Invalid tenant ID source
```

## 📚 Examples

### Example 1: Basic Usage
```typescript
export async function GET(request: NextRequest) {
  await TenantAuthNextService.authenticateTenantByRequest({ 
    request, 
    requiredTenantRole: "USER" 
  });
  
  // request.tenant and request.tenantMember are now available
}
```

### Example 2: Admin Required
```typescript
export async function POST(request: NextRequest) {
  await TenantAuthNextService.authenticateTenantByRequest({ 
    request, 
    requiredTenantRole: "ADMIN" // ADMIN or OWNER required
  });
  
  // Admin operations...
}
```

### Example 3: Owner Required
```typescript
export async function DELETE(request: NextRequest) {
  await TenantAuthNextService.authenticateTenantByRequest({ 
    request, 
    requiredTenantRole: "OWNER" // Only OWNER
  });
  
  // Critical operations...
}
```

### Example 4: Destructuring
```typescript
const { user, tenant, tenantMember } = 
  await TenantAuthNextService.authenticateTenantByRequest({ 
    request, 
    requiredTenantRole: "USER" 
  });



### Example 5: Cache Clearing
```typescript
// Update member role
await TenantMemberService.update(memberId, { memberRole: 'ADMIN' });

// Clear cache
await TenantAuthNextService.clearTenantCache(userId, tenantId);
```

## 🔄 Comparison with UserSessionNextService

| Feature | UserSessionNextService | TenantAuthNextService |
|---------|----------------------|---------------------|
| User Auth | ✅ | ✅ (uses internally) |
| Tenant Auth | ❌ | ✅ |
| Role Control | USER/ADMIN/GUEST | OWNER/ADMIN/USER |
| Tenant ID | ❌ | ✅ Multiple sources |
| Membership Check | ❌ | ✅ |
| Cache | User session | Tenant + Member |

## 🛠️ Helper Methods

```typescript
// Extract tenant ID
const tenantId = TenantAuthNextService.extractTenantId(
  request, 
  'header' // or 'query', 'subdomain', etc.
);

// Check role
const hasAccess = TenantAuthNextService.hasRequiredRole(
  'ADMIN', // current role
  'USER'   // required role
); // true (ADMIN > USER)

// Clear cache
await TenantAuthNextService.clearTenantCache(userId, tenantId);
await TenantAuthNextService.clearUserTenantCaches(userId);
```

## 🌐 Environment Variables

```env
TENANT_CACHE_TTL=300  # 5 minutes (default)
```

## 📦 Dependencies

- `@/modules/user_session/user_session.service.next` - User authentication
- `@/modules/tenant/tenant.service` - Tenant operations
- `@/modules/tenant_member/tenant_member.service` - Membership operations
- `@/libs/redis` - Caching

## 🎓 Best Practices

1. **Always use rate limiting:**
   ```typescript
   await Limiter.checkRateLimit(request);
   await TenantAuthNextService.authenticateTenantByRequest(...);
   ```

2. **Clear cache after updates:**
   ```typescript
   await TenantMemberService.update(...);
   await TenantAuthNextService.clearTenantCache(...);
   ```

3. **Use minimum required role:**
   ```typescript
   // USER is sufficient for reading
   requiredTenantRole: "USER"
   
   // ADMIN for writing
   requiredTenantRole: "ADMIN"
   
   // OWNER for critical operations
   requiredTenantRole: "OWNER"
   ```

4. **Separate error messages:**
   ```typescript
   catch (error: any) {
     const status = error.message.includes('not a member') ? 403 : 500;
     return NextResponse.json({ message: error.message }, { status });
   }
   ```

## 🚦 Status Codes

- `200` - Success
- `401` - User not authenticated
- `403` - Insufficient tenant permissions / Not a member
- `404` - Tenant not found
- `500` - Server error
