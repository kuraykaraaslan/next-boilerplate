import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
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

vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(async () => _fakeDS),
  tenantDataSourceFor: vi.fn(async () => _fakeDS),
}));

vi.mock('@/modules/redis', () => ({
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

vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@/modules/setting/setting.service', () => ({
  default: {
    getByKeys: vi.fn(async () => ({
      openaiApiKey: 'sk-test-openai',
      anthropicApiKey: 'sk-test-anthropic',
      googleAiApiKey: 'test-google-ai-key',
      aiDefaultProvider: 'openai',
    })),
  },
}));

vi.mock('@/modules/tenant_usage/tenant_usage.service', () => ({
  TenantUsageService: {
    getUsage: vi.fn(async () => ({ aiTokens: 0 })),
    incrementAiTokens: vi.fn(async () => {}),
    incrementApiCall: vi.fn(async () => 1),
    incrementStorageBytes: vi.fn(async () => {}),
    incrementEmailSends: vi.fn(async () => {}),
    incrementSmsSends: vi.fn(async () => {}),
  },
}));

const mockChatResponse = {
  content: 'Hello from mock AI',
  model: 'gpt-4o-mini',
  provider: 'openai' as const,
  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
  finishReason: 'stop',
};

const mockEmbeddingResponse = {
  embeddings: [[0.1, 0.2, 0.3]],
  model: 'text-embedding-ada-002',
  provider: 'openai' as const,
  usage: { totalTokens: 5 },
};

vi.mock('./providers/openai.provider', () => ({
  default: class MockOpenAIProvider {
    providerType = 'openai';
    config: any;
    constructor(config: any) { this.config = config; }
    isConfigured() { return true; }
    async chat() { return mockChatResponse; }
    async chatStream(_opts: any, onChunk: (c: string) => void) { onChunk('Hello'); return mockChatResponse; }
    async embed() { return mockEmbeddingResponse; }
    listModels() { return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']; }
    getDefaultModel() { return 'gpt-4o-mini'; }
    getMaxTokens() { return 4096; }
  },
}));

vi.mock('./providers/anthropic.provider', () => ({
  default: class MockAnthropicProvider {
    providerType = 'anthropic';
    config: any;
    constructor(config: any) { this.config = config; }
    isConfigured() { return true; }
    async chat() { return { ...mockChatResponse, model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' as const }; }
    async chatStream(_opts: any, onChunk: (c: string) => void) { onChunk('Hello from Claude'); return { ...mockChatResponse, provider: 'anthropic' as const }; }
    async embed() { return { ...mockEmbeddingResponse, provider: 'anthropic' as const }; }
    listModels() { return ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']; }
    getDefaultModel() { return 'claude-3-5-sonnet-20241022'; }
    getMaxTokens() { return 4096; }
  },
}));

vi.mock('./providers/google.provider', () => ({
  default: class MockGoogleProvider {
    providerType = 'google';
    config: any;
    constructor(config: any) { this.config = config; }
    isConfigured() { return true; }
    async chat() { return { ...mockChatResponse, model: 'gemini-2.0-flash', provider: 'google' as const }; }
    async chatStream(_opts: any, onChunk: (c: string) => void) { onChunk('Hello from Gemini'); return { ...mockChatResponse, provider: 'google' as const }; }
    async embed() { return { ...mockEmbeddingResponse, provider: 'google' as const }; }
    listModels() { return ['gemini-2.0-flash', 'gemini-1.5-pro']; }
    getDefaultModel() { return 'gemini-2.0-flash'; }
    getMaxTokens() { return 4096; }
  },
}));


// Bypass feature gating in unit tests — tested separately in tenant_subscription/.
vi.mock('@/modules/tenant_subscription/tenant_subscription.feature.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));
import AIService from './ai.service';
import redis from '@/modules/redis';
import { AppError } from '@/modules/common/app-error';
import { OpenAIModels, AnthropicModels, GoogleModels } from './ai.types';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockRedis = redis as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockRedis.get.mockResolvedValue(null);
  mockRedis.set.mockResolvedValue('OK');
  mockRedis.incrby.mockResolvedValue(30);
  mockRedis.expire.mockResolvedValue(1);
  // Reset per-tenant provider cache
  (AIService as any)._tenantProviders?.clear?.();
});

describe('AIService.listProviders', () => {
  it('returns openai, anthropic, and google', () => {
    const providers = AIService.listProviders();
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('google');
    expect(providers).toHaveLength(3);
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
  it('returns true for configured openai provider', async () => {
    expect(await AIService.isProviderConfigured(TENANT_ID, 'openai')).toBe(true);
  });

  it('returns true for configured anthropic provider', async () => {
    expect(await AIService.isProviderConfigured(TENANT_ID, 'anthropic')).toBe(true);
  });
});

describe('AIService.getProviderForModel', () => {
  it('returns openai for a GPT model', () => {
    expect(AIService.getProviderForModel('gpt-4o')).toBe('openai');
    expect(AIService.getProviderForModel('gpt-4o-mini')).toBe('openai');
  });

  it('returns anthropic for a Claude model', () => {
    expect(AIService.getProviderForModel('claude-3-5-sonnet-20241022')).toBe('anthropic');
    expect(AIService.getProviderForModel('claude-3-5-haiku-20241022')).toBe('anthropic');
  });

  it('returns google for a Gemini model', () => {
    expect(AIService.getProviderForModel('gemini-2.0-flash')).toBe('google');
    expect(AIService.getProviderForModel('gemini-1.5-pro')).toBe('google');
  });

  it('returns null for an unknown model', () => {
    expect(AIService.getProviderForModel('llama-3' as any)).toBeNull();
  });
});

describe('AIService.listAllModels', () => {
  it('returns model arrays for all three providers', () => {
    const all = AIService.listAllModels();
    expect(all.openai).toContain('gpt-4o');
    expect(all.anthropic).toContain('claude-3-5-sonnet-20241022');
    expect(all.google).toContain('gemini-2.0-flash');
  });
});

describe('AIService.listModels', () => {
  it('returns model list for openai provider', async () => {
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

  it('auto-detects anthropic from Claude model', async () => {
    const response = await AIService.chat(TENANT_ID, {
      messages: [{ role: 'user', content: 'Hello!' }],
      model: 'claude-3-5-sonnet-20241022',
    });
    expect(response.provider).toBe('anthropic');
  });

  it('tracks usage in redis after successful chat', async () => {
    await AIService.chat(TENANT_ID, {
      messages: [{ role: 'user', content: 'Hello!' }],
      provider: 'openai',
    });
    expect(mockRedis.incrby).toHaveBeenCalledWith(
      expect.stringContaining(`ai:usage:${TENANT_ID}:openai:`),
      30
    );
  });

  it('throws AIError when provider is not configured', async () => {
    // Inject a not-configured bundle for this tenant directly
    const notConfigured = {
      providerType: 'openai',
      isConfigured: () => false,
      chat: vi.fn(),
      chatStream: vi.fn(),
      embed: vi.fn(),
      listModels: () => [],
    };
    (AIService as any)._tenantProviders.set(TENANT_ID, {
      openai: notConfigured,
      anthropic: notConfigured,
      google: notConfigured,
      defaultProvider: 'openai',
    });

    await expect(
      AIService.chat(TENANT_ID, { messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' })
    ).rejects.toThrow(AppError);
  });
});

describe('AIService.chatStream', () => {
  it('calls onChunk with streamed content and returns response', async () => {
    const chunks: string[] = [];
    const response = await AIService.chatStream(TENANT_ID, 
      { messages: [{ role: 'user', content: 'Stream this' }], provider: 'openai' },
      (chunk: string) => chunks.push(chunk)
    );

    expect(chunks).toContain('Hello');
    expect(response.content).toBe('Hello from mock AI');
  });
});

describe('AIService.embed', () => {
  it('returns EmbeddingResponse from openai', async () => {
    const response = await AIService.embed(TENANT_ID, {
      input: 'Test text for embedding',
      provider: 'openai',
    });

    expect(response.embeddings).toHaveLength(1);
    expect(response.provider).toBe('openai');
  });

  it('throws AIError when embedding provider is not configured', async () => {
    const notConfigured = {
      providerType: 'openai',
      isConfigured: () => false,
      chat: vi.fn(),
      chatStream: vi.fn(),
      embed: vi.fn(),
      listModels: () => [],
    };
    (AIService as any)._tenantProviders.set(TENANT_ID, {
      openai: notConfigured,
      anthropic: notConfigured,
      google: notConfigured,
      defaultProvider: 'openai',
    });

    await expect(
      AIService.embed(TENANT_ID, { input: 'test', provider: 'openai' })
    ).rejects.toThrow(AppError);
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
  it('sends question with system prompt and returns string', async () => {
    const result = await AIService.ask(TENANT_ID, 
      'What is the capital of France?',
      'You are a geography expert.',
      { provider: 'openai' }
    );
    expect(typeof result).toBe('string');
  });
});

describe('AIService.isRateLimited', () => {
  it('returns false when no rate limit is set', async () => {
    mockRedis.get.mockResolvedValue(null);
    const limited = await AIService.isRateLimited('user-1');
    expect(limited).toBe(false);
  });

  it('returns true when rate limit is active', async () => {
    mockRedis.get.mockResolvedValue('1');
    const limited = await AIService.isRateLimited('user-1');
    expect(limited).toBe(true);
  });
});

describe('AIService.setRateLimit', () => {
  it('sets rate limit key in redis with expiry', async () => {
    await AIService.setRateLimit('user-1', 60);
    expect(mockRedis.set).toHaveBeenCalledWith('ai:rate-limit:user-1', '1', 'EX', 60);
  });
});

describe('AIService.getUsage', () => {
  it('returns usage record with date keys', async () => {
    mockRedis.get.mockResolvedValue('1500');
    const usage = await AIService.getUsage(TENANT_ID, 'openai', 3);
    expect(Object.keys(usage)).toHaveLength(3);
    for (const val of Object.values(usage)) {
      expect(typeof val).toBe('number');
    }
  });

  it('returns zeros for dates with no data', async () => {
    mockRedis.get.mockResolvedValue(null);
    const usage = await AIService.getUsage(TENANT_ID, 'anthropic', 2);
    for (const val of Object.values(usage)) {
      expect(val).toBe(0);
    }
  });
});

describe('AIService.getTotalUsage', () => {
  it('sums usage over given days', async () => {
    mockRedis.get.mockResolvedValue('100');
    const total = await AIService.getTotalUsage(TENANT_ID, 'openai', 3);
    expect(total).toBe(300); // 100 * 3 days
  });
});

describe('AIService.reinitializeProvider', () => {
  beforeEach(async () => {
    // Force the tenant bundle to be built so reinit has a cache entry to mutate.
    await AIService.getProvider(TENANT_ID, 'openai');
  });

  it('replaces the openai provider instance', () => {
    AIService.reinitializeProvider(TENANT_ID, 'openai', { apiKey: 'new-key', defaultModel: 'gpt-4' });
    const bundle = (AIService as any)._tenantProviders.get(TENANT_ID);
    expect(bundle?.openai).toBeTruthy();
  });

  it('replaces the anthropic provider instance', () => {
    AIService.reinitializeProvider(TENANT_ID, 'anthropic', { apiKey: 'new-anthropic-key' });
    const bundle = (AIService as any)._tenantProviders.get(TENANT_ID);
    expect(bundle?.anthropic).toBeTruthy();
  });

  it('replaces the google provider instance', () => {
    AIService.reinitializeProvider(TENANT_ID, 'google', { apiKey: 'new-google-key' });
    const bundle = (AIService as any)._tenantProviders.get(TENANT_ID);
    expect(bundle?.google).toBeTruthy();
  });
});
