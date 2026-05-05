import 'reflect-metadata';
import crypto from 'crypto';
import { tenantDataSourceFor } from '@/libs/typeorm';
import { ApiKey as ApiKeyEntity } from './entities/api_key.entity';
import { SafeApiKey, SafeApiKeySchema } from './api_key.types';
import type { CreateApiKeyInput, UpdateApiKeyInput, ListApiKeysInput } from './api_key.dto';
import ApiKeyMessages from './api_key.messages';
import type { ApiKeyScope } from './api_key.enums';

export default class ApiKeyService {

  static generateRawKey(tenantId: string): string {
    const prefix = tenantId.replace(/-/g, '').slice(0, 8);
    const secret = crypto.randomBytes(24).toString('hex');
    return `sk_live_${prefix}_${secret}`;
  }

  static hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  static extractPrefix(rawKey: string): string {
    // "sk_live_abcd1234_..." → display first 20 chars + "..."
    return rawKey.slice(0, 20);
  }

  static async list({ tenantId, page, pageSize }: ListApiKeysInput): Promise<{ keys: SafeApiKey[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const safePage = Math.max(1, page);
    const [rows, total] = await repo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return { keys: rows.map((r) => SafeApiKeySchema.parse(r)), total };
  }

  static async getById(tenantId: string, apiKeyId: string): Promise<SafeApiKey> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(ApiKeyEntity).findOne({ where: { apiKeyId, tenantId } });
    if (!row) throw new Error(ApiKeyMessages.NOT_FOUND);
    return SafeApiKeySchema.parse(row);
  }

  static async create(
    tenantId: string,
    createdByUserId: string,
    input: CreateApiKeyInput,
  ): Promise<{ key: SafeApiKey; rawKey: string }> {
    const rawKey = ApiKeyService.generateRawKey(tenantId);
    const keyHash = ApiKeyService.hashKey(rawKey);
    const keyPrefix = ApiKeyService.extractPrefix(rawKey);

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const entity = repo.create({
      tenantId,
      createdByUserId,
      name: input.name,
      description: input.description ?? null,
      keyHash,
      keyPrefix,
      scopes: input.scopes,
      isActive: true,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });

    const saved = await repo.save(entity);
    return { key: SafeApiKeySchema.parse(saved), rawKey };
  }

  static async update(
    tenantId: string,
    apiKeyId: string,
    input: UpdateApiKeyInput,
  ): Promise<SafeApiKey> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const row = await repo.findOne({ where: { apiKeyId, tenantId } });
    if (!row) throw new Error(ApiKeyMessages.NOT_FOUND);

    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description ?? null;
    if (input.isActive !== undefined) row.isActive = input.isActive;

    const saved = await repo.save(row);
    return SafeApiKeySchema.parse(saved);
  }

  static async delete(tenantId: string, apiKeyId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const row = await repo.findOne({ where: { apiKeyId, tenantId } });
    if (!row) throw new Error(ApiKeyMessages.NOT_FOUND);

    await repo.remove(row);
  }

  /**
   * Verify a raw API key from an incoming request.
   * Updates lastUsedAt on success.
   * Throws with a descriptive message on any failure.
   */
  static async verify(rawKey: string, requiredScope?: ApiKeyScope): Promise<SafeApiKey> {
    const hash = ApiKeyService.hashKey(rawKey);

    // We need to search across the default tenant DS since we don't know tenantId yet
    const { getDefaultTenantDataSource } = await import('@/libs/typeorm');
    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(ApiKeyEntity);

    const row = await repo.findOne({ where: { keyHash: hash } });
    if (!row) throw new Error(ApiKeyMessages.INVALID_KEY);

    if (!row.isActive) throw new Error(ApiKeyMessages.KEY_INACTIVE);

    if (row.expiresAt && row.expiresAt < new Date()) {
      throw new Error(ApiKeyMessages.KEY_EXPIRED);
    }

    if (requiredScope && !row.scopes.includes(requiredScope)) {
      throw new Error(ApiKeyMessages.INSUFFICIENT_SCOPE);
    }

    // Fire-and-forget lastUsedAt update
    repo.update({ apiKeyId: row.apiKeyId }, { lastUsedAt: new Date() }).catch(() => {});

    return SafeApiKeySchema.parse(row);
  }
}
