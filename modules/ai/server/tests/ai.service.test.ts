import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    STRIPE_SECRET_KEY: 'sk_test_xxx',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '587',
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'test',
    AI_DEFAULT_PROVIDER: 'openai',
    OPENAI_API_KEY: 'sk-test-openai',
    OPENAI_DEFAULT_MODEL: 'gpt-4o-mini',
    OPENAI_MAX_TOKENS: 4096,
    ANTHROPIC_API_KEY: 'sk-test-anthropic',
    ANTHROPIC_DEFAULT_MODEL: 'claude-3-5-sonnet-20241022',
    ANTHROPIC_MAX_TOKENS: 4096,
    GOOGLE_AI_API_KEY: 'test-google-ai-key',
    GOOGLE_DEFAULT_MODEL: 'gemini-2.0-flash',
    GOOGLE_MAX_TOKENS: 4096,
  },
}));

const _fakeRepo = {
  find: vi.fn(async () => []),
  findOne: vi.fn(async () => null),
  create: vi.fn((v: unknown) => v),
  save: vi.fn(async (v: unknown) => v),
  findAndCount: vi.fn(async () => [[], 0]),
  softRemove: vi.fn(async (v: unknown) => v),
};
const _fakeDS = { getRepository: vi.fn(() => _fakeRepo) };

vi.mock('@kuraykaraaslan/db', () => ({
  getDataSource: vi.fn(async () => _fakeDS),
  tenantDataSourceFor: vi.fn(async () => _fakeDS),
}));

vi.mock('@kuraykaraaslan/redis', () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    setex: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    ping: vi.fn(async () => 'PONG'),
    mget: vi.fn(async () => []),
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    exists: vi.fn(async () => 0),
  },
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));

vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@kuraykaraaslan/setting/server/setting.service', () => ({
  default: {
    getByKeys: vi.fn(async () => ({
      openaiApiKey: 'sk-test-openai',
      anthropicApiKey: 'sk-test-anthropic',
      googleAiApiKey: 'test-google-ai-key',
      aiDefaultProvider: 'openai',
    })),
  },
}));

vi.mock('@kuraykaraaslan/tenant_usage/server/tenant_usage.service', () => ({
  TenantUsageService: {
    getUsage: vi.fn(async () => ({ aiTokens: 0 })),
    incrementAiTokens: vi.fn(async () => {}),
    incrementApiCall: vi.fn(async () => 1),
    incrementStorageBytes: vi.fn(async () => {}),
    incrementEmailSends: vi.fn(async () => {}),
    incrementSmsSends: vi.fn(async () => {}),
  },
}));

// Bypass feature gating in unit tests — tested separately in tenant_subscription/.
vi.mock('@kuraykaraaslan/tenant_subscription/server/tenant_subscription.feature.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));

// ── Provider modules are now discovered through the extension registry, gated by
// the tenant's enabled-module set. Mock both so the registry-driven service can
// resolve providers without the build-time generated artifacts. ───────────────

const MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-preview'],
  anthropic: [
    'claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229',
    'claude-3-sonnet-20240229', 'claude-3-haiku-20240307',
  ],
  google: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
};

function makeProvider(key: string, configured = true) {
  return {
    providerType: key,
    isConfigured: () => configured,
    async chat() {
      return {
        content: 'Hello from mock AI', model: MODELS[key][0], provider: key,
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }, finishReason: 'stop',
      };
    },
    async chatStream(_opts: unknown, onChunk: (c: string) => void) {
      onChunk('Hello');
      return {
        content: 'Hello from mock AI', model: MODELS[key][0], provider: key,
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      };
    },
    async embed() {
      return { embeddings: [[0.1, 0.2, 0.3]], model: 'text-embedding-ada-002', provider: key, usage: { totalTokens: 5 } };
    },
    listModels: () => MODELS[key],
    getDefaultModel: () => MODELS[key][0],
    getMaxTokens: () => 4096,
  };
}

const IMPLS: Record<string, any> = {
  openai:    { key: 'openai',    settingKeys: ['openaiApiKey'],    resolveConfig: (s: any) => ({ apiKey: s.openaiApiKey || '' }),    create: () => makeProvider('openai') },
  anthropic: { key: 'anthropic', settingKeys: ['anthropicApiKey'], resolveConfig: (s: any) => ({ apiKey: s.anthropicApiKey || '' }), create: () => makeProvider('anthropic') },
  google:    { key: 'google',    settingKeys: ['googleAiApiKey'],  resolveConfig: (s: any) => ({ apiKey: s.googleAiApiKey || '' }),  create: () => makeProvider('google') },
};

const CONTRIBS = [
  { id: 'ai_openai:ai:provider:openai',       point: 'ai:provider', moduleId: 'ai_openai',    key: 'openai',    exportId: '', order: 100, scope: 'both', permissions: [], metadata: { label: 'OpenAI',    models: MODELS.openai } },
  { id: 'ai_anthropic:ai:provider:anthropic', point: 'ai:provider', moduleId: 'ai_anthropic', key: 'anthropic', exportId: '', order: 100, scope: 'both', permissions: [], metadata: { label: 'Anthropic', models: MODELS.anthropic } },
  { id: 'ai_google:ai:provider:google',       point: 'ai:provider', moduleId: 'ai_google',    key: 'google',    exportId: '', order: 100, scope: 'both', permissions: [], metadata: { label: 'Google',    models: MODELS.google } },
];

// Mutable per-test: which provider modules are enabled for the tenant.
let enabledModuleIds = new Set<string>(['ai', 'ai_openai', 'ai_anthropic', 'ai_google']);

vi.mock('@kuraykaraaslan/setting/server/module-activation.service.next', () => ({
  getEnabledModuleIds: vi.fn(async () => enabledModuleIds),
}));

vi.mock('@kuraykaraaslan/common/server/extension-registry', () => ({
  extensionRegistry: {
    getContributions: (point: string, filter?: { enabledIds?: Set<string> }) =>
      CONTRIBS.filter((c) => c.point === point && (!filter?.enabledIds || filter.enabledIds.has(c.moduleId))),
    load: async (ext: { key: string }) => IMPLS[ext.key],
  },
}));

import AIService from '../ai.service';
import AIProviderService from '../ai.provider.service';
import redis from '@kuraykaraaslan/redis';
import { AppError } from '@kuraykaraaslan/common/server/app-error';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockRedis = redis as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockRedis.get.mockResolvedValue(null);
  mockRedis.set.mockResolvedValue('OK');
  mockRedis.incrby.mockResolvedValue(30);
  mockRedis.expire.mockResolvedValue(1);
  // All providers enabled by default; reset the per-tenant provider cache.
  enabledModuleIds = new Set<string>(['ai', 'ai_openai', 'ai_anthropic', 'ai_google']);
  (AIProviderService as any)._tenantProviders?.clear?.();
});

describe('AIProviderService.listProviders (tenant-scoped)', () => {
  it('returns every enabled provider', async () => {
    const providers = await AIService.listProviders(TENANT_ID);
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('google');
    expect(providers).toHaveLength(3);
  });

  it('omits a provider whose module is disabled for the tenant', async () => {
    enabledModuleIds = new Set<string>(['ai', 'ai_openai', 'ai_google']); // ai_anthropic off
    const providers = await AIService.listProviders(TENANT_ID);
    expect(providers).not.toContain('anthropic');
    expect(providers).toContain('openai');
    expect(providers).toContain('google');
  });

  it('returns nothing when no provider module is enabled', async () => {
    enabledModuleIds = new Set<string>(['ai']);
    expect(await AIService.listProviders(TENANT_ID)).toHaveLength(0);
  });
});

describe('AIService.listConfiguredProviders', () => {
  it('returns all providers when all are configured', async () => {
    const configured = await AIService.listConfiguredProviders(TENANT_ID);
    expect(configured).toContain('openai');
    expect(configured).toContain('anthropic');
    expect(configured).toContain('google');
  });
});

describe('AIService.isProviderConfigured', () => {
  it('returns true for an enabled, configured provider', async () => {
    expect(await AIService.isProviderConfigured(TENANT_ID, 'openai')).toBe(true);
    expect(await AIService.isProviderConfigured(TENANT_ID, 'anthropic')).toBe(true);
  });

  it('returns false for a disabled provider', async () => {
    enabledModuleIds = new Set<string>(['ai', 'ai_openai']);
    expect(await AIService.isProviderConfigured(TENANT_ID, 'anthropic')).toBe(false);
  });
});

describe('AIService.getProviderForModel', () => {
  it('maps GPT models to openai', () => {
    expect(AIService.getProviderForModel('gpt-4o')).toBe('openai');
    expect(AIService.getProviderForModel('gpt-4o-mini')).toBe('openai');
  });

  it('maps Claude models to anthropic', () => {
    expect(AIService.getProviderForModel('claude-3-5-sonnet-20241022')).toBe('anthropic');
    expect(AIService.getProviderForModel('claude-3-5-haiku-20241022')).toBe('anthropic');
  });

  it('maps Gemini models to google', () => {
    expect(AIService.getProviderForModel('gemini-2.0-flash')).toBe('google');
    expect(AIService.getProviderForModel('gemini-1.5-pro')).toBe('google');
  });

  it('returns null for an unknown model', () => {
    expect(AIService.getProviderForModel('llama-3')).toBeNull();
  });
});

describe('AIService.listAllModels (tenant-scoped)', () => {
  it('returns model arrays keyed by enabled provider', async () => {
    const all = await AIService.listAllModels(TENANT_ID);
    expect(all.openai).toContain('gpt-4o');
    expect(all.anthropic).toContain('claude-3-5-sonnet-20241022');
    expect(all.google).toContain('gemini-2.0-flash');
  });

  it('drops a disabled provider', async () => {
    enabledModuleIds = new Set<string>(['ai', 'ai_openai']);
    const all = await AIService.listAllModels(TENANT_ID);
    expect(all.openai).toBeDefined();
    expect(all.anthropic).toBeUndefined();
  });
});

describe('AIService.listModels', () => {
  it('returns the model list for the openai provider', async () => {
    const models = await AIService.listModels(TENANT_ID, 'openai');
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });
});

describe('AIService.chat', () => {
  it('returns a ChatCompletionResponse from openai', async () => {
    const response = await AIService.chat(TENANT_ID, {
      messages: [{ role: 'user', content: 'Hello!' }],
      provider: 'openai',
    });
    expect(response.content).toBe('Hello from mock AI');
    expect(response.provider).toBe('openai');
    expect(response.usage?.totalTokens).toBe(30);
  });

  it('auto-detects provider from model name', async () => {
    const response = await AIService.chat(TENANT_ID, {
      messages: [{ role: 'user', content: 'Hello!' }],
      model: 'gpt-4o-mini',
    });
    expect(response.provider).toBe('openai');
  });

  it('auto-detects anthropic from a Claude model', async () => {
    const response = await AIService.chat(TENANT_ID, {
      messages: [{ role: 'user', content: 'Hello!' }],
      model: 'claude-3-5-sonnet-20241022',
    });
    expect(response.provider).toBe('anthropic');
  });

  it('tracks usage in redis after a successful chat', async () => {
    await AIService.chat(TENANT_ID, {
      messages: [{ role: 'user', content: 'Hello!' }],
      provider: 'openai',
    });
    expect(mockRedis.incrby).toHaveBeenCalledWith(
      expect.stringContaining(`ai:usage:${TENANT_ID}:openai:`),
      30,
    );
  });

  it('rejects an explicit provider whose module is disabled', async () => {
    enabledModuleIds = new Set<string>(['ai', 'ai_openai']); // anthropic off
    await expect(
      AIService.chat(TENANT_ID, { messages: [{ role: 'user', content: 'Hi' }], provider: 'anthropic' }),
    ).rejects.toThrow(AppError);
  });

  it('throws when no provider module is enabled', async () => {
    enabledModuleIds = new Set<string>(['ai']);
    await expect(
      AIService.chat(TENANT_ID, { messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' }),
    ).rejects.toThrow(AppError);
  });
});

describe('AIService.chatStream', () => {
  it('calls onChunk with streamed content and returns the response', async () => {
    const chunks: string[] = [];
    const response = await AIService.chatStream(
      TENANT_ID,
      { messages: [{ role: 'user', content: 'Stream this' }], provider: 'openai' },
      (chunk: string) => chunks.push(chunk),
    );
    expect(chunks).toContain('Hello');
    expect(response.content).toBe('Hello from mock AI');
  });
});

describe('AIService.embed', () => {
  it('returns an EmbeddingResponse from openai', async () => {
    const response = await AIService.embed(TENANT_ID, { input: 'Test text', provider: 'openai' });
    expect(response.embeddings).toHaveLength(1);
    expect(response.provider).toBe('openai');
  });
});

describe('AIService.complete', () => {
  it('returns string content from the chat response', async () => {
    const result = await AIService.complete(TENANT_ID, 'What is 2+2?', { provider: 'openai' });
    expect(typeof result).toBe('string');
    expect(result).toBe('Hello from mock AI');
  });
});

describe('AIService.ask', () => {
  it('sends a question with a system prompt and returns a string', async () => {
    const result = await AIService.ask(
      TENANT_ID,
      'What is the capital of France?',
      'You are a geography expert.',
      { provider: 'openai' },
    );
    expect(typeof result).toBe('string');
  });
});

describe('AIService.isRateLimited', () => {
  it('returns false when no rate limit is set', async () => {
    mockRedis.get.mockResolvedValue(null);
    expect(await AIService.isRateLimited('user-1')).toBe(false);
  });

  it('returns true when a rate limit is active', async () => {
    mockRedis.get.mockResolvedValue('1');
    expect(await AIService.isRateLimited('user-1')).toBe(true);
  });
});

describe('AIService.setRateLimit', () => {
  it('sets the rate limit key in redis with expiry', async () => {
    await AIService.setRateLimit('user-1', 60);
    expect(mockRedis.set).toHaveBeenCalledWith('ai:rate-limit:user-1', '1', 'EX', 60);
  });
});

describe('AIService.getUsage', () => {
  it('returns a usage record with date keys', async () => {
    mockRedis.get.mockResolvedValue('1500');
    const usage = await AIService.getUsage(TENANT_ID, 'openai', 3);
    expect(Object.keys(usage)).toHaveLength(3);
    for (const val of Object.values(usage)) expect(typeof val).toBe('number');
  });
});

describe('AIService.getTotalUsage', () => {
  it('sums usage over the given days', async () => {
    mockRedis.get.mockResolvedValue('100');
    const total = await AIService.getTotalUsage(TENANT_ID, 'openai', 3);
    expect(total).toBe(300);
  });
});

describe('AIProviderService.invalidateTenant', () => {
  it('clears cached provider instances for the tenant', async () => {
    await AIService.getProvider(TENANT_ID, 'openai');
    expect((AIProviderService as any)._tenantProviders.get(TENANT_ID)?.size).toBeGreaterThan(0);
    AIService.invalidateTenant(TENANT_ID);
    expect((AIProviderService as any)._tenantProviders.get(TENANT_ID)).toBeUndefined();
  });
});
