// types/global.d.ts veya tanımladığın yer
import { NextRequest as OriginalNextRequest } from 'next/server'
import SafeUser from './types/SafeUser'
import { SafeUserSession } from './modules/user_session/user_session.types'
import { SafeTenant } from './modules/tenant/tenant.types'
import { SafeTenantMember } from './modules/tenant_member/tenant_member.types'

declare global {
    interface NextRequest extends OriginalNextRequest {
        user?: SafeUser
        userSession?: SafeUserSession
        tenant?: SafeTenant
        tenantMember?: SafeTenantMember
    }
}