import { describe, it, expect } from 'vitest';
import {
  UpsertConnectorRequestSchema,
  ConnectApiKeyRequestSchema,
  BeginOAuthRequestSchema,
  OAuthCallbackQuerySchema,
  FireTriggerRequestSchema,
} from '../integrations_hub.dto';

describe('UpsertConnectorRequestSchema', () => {
  const valid = { key: 'slack', name: 'Slack', authType: 'OAUTH2' as const };

  it('accepts a valid connector and defaults category/isEnabled', () => {
    const result = UpsertConnectorRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('other');
      expect(result.data.isEnabled).toBe(true);
    }
  });

  it('rejects an invalid connector key', () => {
    expect(UpsertConnectorRequestSchema.safeParse({ ...valid, key: 'Bad Key!' }).success).toBe(false);
  });

  it('rejects an unknown auth type', () => {
    expect(UpsertConnectorRequestSchema.safeParse({ ...valid, authType: 'MAGIC' }).success).toBe(false);
  });
});

describe('ConnectApiKeyRequestSchema', () => {
  it('defaults scopes to read+write', () => {
    const result = ConnectApiKeyRequestSchema.safeParse({ connectorKey: 'zapier' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.scopes).toEqual(['read', 'write']);
  });

  it('rejects an empty scope list', () => {
    expect(ConnectApiKeyRequestSchema.safeParse({ connectorKey: 'zapier', scopes: [] }).success).toBe(false);
  });
});

describe('BeginOAuthRequestSchema', () => {
  it('requires a valid redirect URI', () => {
    expect(BeginOAuthRequestSchema.safeParse({ connectorKey: 'slack', redirectUri: 'not-a-url' }).success).toBe(false);
    expect(BeginOAuthRequestSchema.safeParse({ connectorKey: 'slack', redirectUri: 'https://app.test/cb' }).success).toBe(true);
  });
});

describe('OAuthCallbackQuerySchema', () => {
  it('requires both code and state', () => {
    expect(OAuthCallbackQuerySchema.safeParse({ code: 'abc' }).success).toBe(false);
    expect(OAuthCallbackQuerySchema.safeParse({ code: 'abc', state: 'xyz' }).success).toBe(true);
  });
});

describe('FireTriggerRequestSchema', () => {
  it('defaults payload to an empty object', () => {
    const result = FireTriggerRequestSchema.safeParse({ connectorKey: 'slack', eventKey: 'order.created' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.payload).toEqual({});
  });
});
