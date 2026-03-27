// types/global.d.ts veya tanımladığın yer
import { NextRequest as OriginalNextRequest } from 'next/server'
import SafeUser from './types/SafeUser'
import { SafeUserSession } from './modules/user_session/user_session.types'
import { SafeTenant } from './modules/tenant/tenant.types'
import { SafeTenantMember } from './modules/tenant_member/tenant_member.types'

declare module 'swagger-ui-react' {
    import { ComponentType } from 'react'
    interface SwaggerUIProps {
        url?: string
        spec?: object
        onComplete?: () => void
        requestInterceptor?: (req: object) => object
        responseInterceptor?: (res: object) => object
        docExpansion?: 'list' | 'full' | 'none'
        defaultModelsExpandDepth?: number
        displayOperationId?: boolean
        filter?: boolean | string
        showExtensions?: boolean
        showCommonExtensions?: boolean
        supportedSubmitMethods?: string[]
        tryItOutEnabled?: boolean
        validatorUrl?: string | null
        withCredentials?: boolean
    }
    const SwaggerUI: ComponentType<SwaggerUIProps>
    export default SwaggerUI
}

declare global {
    interface NextRequest extends OriginalNextRequest {
        user?: SafeUser
        userSession?: SafeUserSession
        tenant?: SafeTenant
        tenantMember?: SafeTenantMember
        isImpersonating?: boolean
        impersonatedBy?: SafeUser
    }
}