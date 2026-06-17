import 'reflect-metadata';
import type { SafeUserSession } from '@kuraykaraaslan/user_session/server/user_session.types';
import {
  getImpersonationTtlMs,
  isImpersonationDisabled,
} from './impersonation.settings.service';
import {
  startSystemImpersonation,
  startTenantImpersonation,
  type StartSystemImpersonationParams,
  type StartTenantImpersonationParams,
} from './impersonation.flow.service';
import type { ImpersonationSessionResult } from './impersonation.mint.service';
import {
  endImpersonationSession,
  getActiveImpersonationSession,
  getImpersonationContext,
  type EndImpersonationContext,
} from './impersonation.session.service';

/**
 * Impersonation service facade. The implementation is split across focused
 * modules (`impersonation.settings.service`, `impersonation.guards`,
 * `impersonation.mint.service`, `impersonation.flow.service`,
 * `impersonation.session.service`); this class preserves the single
 * `ImpersonationService.*` entry point its callers depend on.
 */
export default class ImpersonationService {
  static getImpersonationTtlMs(tenantId: string): Promise<number> {
    return getImpersonationTtlMs(tenantId);
  }

  static isImpersonationDisabled(tenantId: string): Promise<boolean> {
    return isImpersonationDisabled(tenantId);
  }

  static startSystemImpersonation(params: StartSystemImpersonationParams): Promise<ImpersonationSessionResult> {
    return startSystemImpersonation(params);
  }

  static startTenantImpersonation(params: StartTenantImpersonationParams): Promise<ImpersonationSessionResult> {
    return startTenantImpersonation(params);
  }

  static endImpersonationSession(userSessionId: string, context?: EndImpersonationContext): Promise<void> {
    return endImpersonationSession(userSessionId, context);
  }

  static getActiveImpersonationSession(rawAccessToken: string): Promise<SafeUserSession | null> {
    return getActiveImpersonationSession(rawAccessToken);
  }

  static getImpersonationContext(rawAccessToken: string): ReturnType<typeof getImpersonationContext> {
    return getImpersonationContext(rawAccessToken);
  }
}
