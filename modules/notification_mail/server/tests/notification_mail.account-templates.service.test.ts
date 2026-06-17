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

// Mock mail providers as classes (required because service calls `new Provider()`)
vi.mock('./providers/smtp.provider', () => ({
  default: class MockSMTPProvider {
    name = 'smtp';
    isConfigured() { return true; }
    async sendMail() { return { success: true, messageId: 'test-id' }; }
  },
}));

vi.mock('./providers/sendgrid.provider', () => ({
  default: class MockSendGridProvider {
    name = 'sendgrid';
    isConfigured() { return false; }
    async sendMail() { return { success: false }; }
  },
}));

vi.mock('./providers/mailgun.provider', () => ({
  default: class MockMailgunProvider {
    name = 'mailgun';
    isConfigured() { return false; }
    async sendMail() { return { success: false }; }
  },
}));

vi.mock('./providers/ses.provider', () => ({
  default: class MockSESProvider {
    name = 'ses';
    isConfigured() { return false; }
    async sendMail() { return { success: false }; }
  },
}));

vi.mock('./providers/postmark.provider', () => ({
  default: class MockPostmarkProvider {
    name = 'postmark';
    isConfigured() { return false; }
    async sendMail() { return { success: false }; }
  },
}));

vi.mock('./providers/resend.provider', () => ({
  default: class MockResendProvider {
    name = 'resend';
    isConfigured() { return false; }
    async sendMail() { return { success: false }; }
  },
}));


// Bypass feature gating in unit tests — tested separately in tenant_subscription/.
vi.mock('@kuraykaraaslan/tenant_subscription/server/tenant_subscription.feature.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));
import MailService from '../notification_mail.service';
import MailAccountTemplatesService from '../notification_mail.account-templates.service';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MailAccountTemplatesService.sendTenantInvitationEmail', () => {
  it('queues invitation email without throwing', async () => {
    await expect(
      MailAccountTemplatesService.sendTenantInvitationEmail({
        tenantId: TENANT_ID,
        email: 'invited@example.com',
        tenantName: 'Acme Corp',
        memberRole: 'USER',
        rawToken: 'token-xyz',
      })
    ).resolves.not.toThrow();
  });
});

describe('MailAccountTemplatesService.sendContactFormAdminEmail', () => {
  it('queues email to admin when INFORM_MAIL is set', async () => {
    await expect(
      MailAccountTemplatesService.sendContactFormAdminEmail({
        tenantId: TENANT_ID, message: 'Hello from contact form',
        name: 'Bob',
        email: 'bob@example.com',
        phone: '+1234567890',
      })
    ).resolves.not.toThrow();
  });
});
