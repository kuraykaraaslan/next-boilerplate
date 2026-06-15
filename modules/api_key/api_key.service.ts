import 'reflect-metadata';
import type { SafeApiKey } from './api_key.types';
import type { CreateApiKeyInput, UpdateApiKeyInput, ListApiKeysInput, RotateApiKeyInput } from './api_key.dto';
import type { ApiKeyEnv } from './api_key.enums';
import { generateRawKey, hashKey } from './api_key.crypto';
import { getNegativeCacheTtl } from './api_key.cache';
import { list, getById, create, update, remove } from './api_key.crud.service';
import { rotate, revokeAll, sweepExpired, sweepExpiringSoon } from './api_key.rotation.service';
import { verify, verifyFromAuthHeader, type VerifyContext } from './api_key.verify.service';

export type { VerifyContext };

/**
 * API key service facade. The implementation is split across focused modules
 * (`api_key.crud.service`, `api_key.rotation.service`, `api_key.verify.service`,
 * plus the `api_key.crypto` / `api_key.cache` / `api_key.policy` helpers); this
 * class preserves the single `ApiKeyService.*` entry point its callers depend on.
 */
export default class ApiKeyService {
  static getNegativeCacheTtl(): Promise<number> {
    return getNegativeCacheTtl();
  }

  static generateRawKey(tenantId: string, environment?: ApiKeyEnv): string {
    return generateRawKey(tenantId, environment);
  }

  static hashKey(rawKey: string): string {
    return hashKey(rawKey);
  }

  static list(input: ListApiKeysInput): Promise<{ keys: SafeApiKey[]; total: number }> {
    return list(input);
  }

  static getById(tenantId: string, apiKeyId: string): Promise<SafeApiKey> {
    return getById(tenantId, apiKeyId);
  }

  static create(tenantId: string, createdByUserId: string, input: CreateApiKeyInput): Promise<{ key: SafeApiKey; rawKey: string }> {
    return create(tenantId, createdByUserId, input);
  }

  static update(tenantId: string, apiKeyId: string, input: UpdateApiKeyInput): Promise<SafeApiKey> {
    return update(tenantId, apiKeyId, input);
  }

  static delete(tenantId: string, apiKeyId: string): Promise<void> {
    return remove(tenantId, apiKeyId);
  }

  static rotate(tenantId: string, apiKeyId: string, createdByUserId: string, input: RotateApiKeyInput): Promise<{ key: SafeApiKey; rawKey: string }> {
    return rotate(tenantId, apiKeyId, createdByUserId, input);
  }

  static revokeAll(tenantId: string, actorUserId?: string): Promise<number> {
    return revokeAll(tenantId, actorUserId);
  }

  static sweepExpired(tenantId: string): Promise<number> {
    return sweepExpired(tenantId);
  }

  static sweepExpiringSoon(tenantId: string, withinDays?: number): Promise<number> {
    return sweepExpiringSoon(tenantId, withinDays);
  }

  static verify(rawKey: string, requiredScope?: string, ctx?: VerifyContext): Promise<SafeApiKey> {
    return verify(rawKey, requiredScope, ctx);
  }

  static verifyFromAuthHeader(
    request: { headers: { get: (name: string) => string | null } },
    tenantId?: string,
    requiredScope?: string,
    ctx?: VerifyContext,
  ): Promise<SafeApiKey> {
    return verifyFromAuthHeader(request, tenantId, requiredScope, ctx);
  }
}
