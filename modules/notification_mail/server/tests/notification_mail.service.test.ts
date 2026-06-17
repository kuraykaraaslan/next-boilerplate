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
    MAIL_PROVIDER: 'smtp',
    APPLICATION_NAME: 'Test App',
    APPLICATION_HOST: 'http://localhost:3000',
    MAIL_FROM: 'noreply@test.com',
    INFORM_MAIL: 'admin@test.com',
    INVITATION_TTL_SECONDS: 604800,
  },
}));

vi.mock('@kuraykaraaslan/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
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

// Mock BullMQ queue and worker to avoid real Redis connections
vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    add = vi.fn(async () => ({ id: 'job-1' }));
    close = vi.fn();
  },
  Worker: class MockWorker {
    on = vi.fn();
    close = vi.fn();
  },
  Job: class MockJob {},
}));

vi.mock('@kuraykaraaslan/redis/server/redis.bullmq', () => ({
  getBullMQConnection: vi.fn(() => ({})),
}));

// Mock EJS rendering
vi.mock('ejs', () => ({
  default: {
    renderFile: vi.fn(async (_path: string, data: any) => `<html>Mocked ${data?.subject || 'email'}</html>`),
  },
  renderFile: vi.fn(async (_path: string, data: any) => `<html>Mocked ${data?.subject || 'email'}</html>`),
}));

// Providers now live in satellite modules discovered through the extension
// registry (point `mail:provider`), gated by the tenant's enabled modules. Mock
// both seams: smtp configured, the rest not (preserving the old expectations).
const MAIL_CONFIGURED: Record<string, boolean> = {
  smtp: true, sendgrid: false, mailgun: false, ses: false, postmark: false, resend: false,
};
function mockMailProvider(key: string) {
  return {
    name: key,
    async isConfigured() { return MAIL_CONFIGURED[key]; },
    async sendMail() { return MAIL_CONFIGURED[key] ? { success: true, messageId: 'test-id' } : { success: false }; },
  };
}
const MAIL_CONTRIBS = ['smtp', 'sendgrid', 'mailgun', 'ses', 'postmark', 'resend'].map((key) => ({
  id: `mail_${key}:mail:provider:${key}`, point: 'mail:provider', moduleId: `mail_${key}`, key, metadata: {},
}));

vi.mock('@kuraykaraaslan/setting/server/module-activation.service.next', () => ({
  getEnabledModuleIds: vi.fn(async () => new Set(MAIL_CONTRIBS.map((c) => c.moduleId).concat('notification_mail'))),
}));

vi.mock('@kuraykaraaslan/common/server/extension-registry', () => ({
  extensionRegistry: {
    getContributions: (point: string, filter?: { enabledIds?: Set<string> }) =>
      point === 'mail:provider'
        ? MAIL_CONTRIBS.filter((c) => !filter?.enabledIds || filter.enabledIds.has(c.moduleId))
        : [],
    load: async (ext: { key: string }) => mockMailProvider(ext.key),
  },
}));


// Bypass feature gating in unit tests — tested separately in tenant_subscription/.
vi.mock('@kuraykaraaslan/tenant_subscription/server/tenant_subscription.feature.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));
// Usage gate also runs inside assertMailFeatureAccess — stub it so the mail
// path isn't blocked by a (DB-backed) usage lookup in unit tests.
vi.mock('@kuraykaraaslan/tenant_usage/server/tenant_usage.service', () => ({
  TenantUsageService: {
    getUsage: vi.fn(async () => ({ emailSends: 0 })),
    incrementEmailSends: vi.fn(async () => undefined),
  },
}));
import MailService from '../notification_mail.service';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MailService.getProvider', () => {
  it('returns smtp provider when it is configured', async () => {
    const provider = await MailService.getProvider(TENANT_ID, 'smtp');
    expect(provider).toBeDefined();
    expect(await provider.isConfigured(TENANT_ID)).toBe(true);
  });

  it('falls back to smtp when unknown provider is requested', async () => {
    const provider = await MailService.getProvider(TENANT_ID, 'unknown' as any);
    expect(provider).toBeDefined();
    expect(await provider.isConfigured(TENANT_ID)).toBe(true);
  });
});

describe('MailService.listProviders', () => {
  it('returns all 6 providers', async () => {
    const providers = await MailService.listProviders(TENANT_ID);
    expect(providers).toHaveLength(6);
    const names = providers.map((p: any) => p.name);
    expect(names).toContain('smtp');
    expect(names).toContain('sendgrid');
    expect(names).toContain('mailgun');
    expect(names).toContain('ses');
    expect(names).toContain('postmark');
    expect(names).toContain('resend');
  });

  it('marks smtp as configured and others as not configured', async () => {
    const providers = await MailService.listProviders(TENANT_ID);
    const smtp = providers.find((p: any) => p.name === 'smtp');
    expect(smtp?.configured).toBe(true);
    const sendgrid = providers.find((p: any) => p.name === 'sendgrid');
    expect(sendgrid?.configured).toBe(false);
  });
});

describe('MailService.sendMail', () => {
  it('adds a job to the queue without throwing', async () => {
    await expect(
      MailService.sendMail(TENANT_ID, 'user@example.com', 'Test Subject', '<p>Hello</p>')
    ).resolves.not.toThrow();
  });

  it('handles queue errors gracefully without throwing', async () => {
    // Temporarily make the queue.add throw
    const originalAdd = (MailService.QUEUE as any).add;
    (MailService.QUEUE as any).add = vi.fn(async () => { throw new Error('Queue error'); });

    await expect(
      MailService.sendMail(TENANT_ID, 'user@example.com', 'Test Subject', '<p>Hello</p>')
    ).resolves.not.toThrow();

    (MailService.QUEUE as any).add = originalAdd;
  });
});

describe('MailService.sendMailDirect', () => {
  it('returns a MailResult with success true', async () => {
    const result = await MailService.sendMailDirect(TENANT_ID, 
      'user@example.com',
      'Direct Subject',
      '<p>Direct</p>'
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('test-id');
  });
});
