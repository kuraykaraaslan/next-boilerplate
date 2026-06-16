import type { SafeUser } from '@nb/user/server/user.types';
import type { SafeUserSession } from '@nb/user_session/server/user_session.types';
import type { SafeTenant } from '@nb/tenant/server/tenant.types';
import type { SafeTenantMember } from '@nb/tenant_member/server/tenant_member.types';

declare module 'swagger-ui-react' {
  import { ComponentType } from 'react';
  interface SwaggerUIProps {
    url?: string;
    spec?: object;
    onComplete?: () => void;
    requestInterceptor?: (req: object) => object;
    responseInterceptor?: (res: object) => object;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    displayOperationId?: boolean;
    filter?: boolean | string;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    supportedSubmitMethods?: string[];
    tryItOutEnabled?: boolean;
    validatorUrl?: string | null;
    withCredentials?: boolean;
  }
  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}

declare module 'next/server' {
  interface NextRequest {
    user?: SafeUser | null;
    userSession?: SafeUserSession;
    tenant?: SafeTenant;
    tenantMember?: SafeTenantMember;
    isImpersonating?: boolean;
    impersonatedBy?: SafeUser;
  }
}
