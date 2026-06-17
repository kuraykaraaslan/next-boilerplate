import { describe, it, expect } from 'vitest';
import { TENANT_ID } from './tenant_subscription.feature.test-setup';
import redis from '@kuraykaraaslan/redis';
import TenantFeatureGateService from '../tenant_subscription.feature.service';

describe('TenantFeatureGateService.invalidateFeatureCache', () => {
  it('calls redis.del with the correct feature cache key', async () => {
    (redis.del as any).mockResolvedValue(1);
    await TenantFeatureGateService.invalidateFeatureCache(TENANT_ID);
    expect(redis.del).toHaveBeenCalledWith(`feature:sub:${TENANT_ID}`);
  });
});
