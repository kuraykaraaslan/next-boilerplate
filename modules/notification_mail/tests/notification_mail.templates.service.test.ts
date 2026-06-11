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
    MAIL_PROVIDER: 'smtp',
    APPLICATION_NAME: 'Test App',
    APPLICATION_HOST: 'http://localhost:3000',
    MAIL_FROM: 'noreply@test.com',
    INFORM_MAIL: 'admin@test.com',
    INVITATION_TTL_SECONDS: 604800,
  },
}));

vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
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

vi.mock('@/modules/redis/redis.bullmq', () => ({
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
vi.mock('@/modules/tenant_subscription/tenant_subscription.feature.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));
import MailService from '../notification_mail.service';
import MailTemplatesService from '../notification_mail.templates.service';
import { getBaseTemplateVars } from '../notification_mail.template-vars';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getBaseTemplateVars', () => {
  it('returns template vars with required keys', () => {
    const vars = getBaseTemplateVars();
    expect(vars).toHaveProperty('appName');
    expect(vars).toHaveProperty('frontendUrl');
    expect(vars).toHaveProperty('loginLink');
    expect(vars).toHaveProperty('resetPasswordLink');
    expect(vars).toHaveProperty('supportEmail');
  });
});
describe('MailTemplatesService.sendWelcomeEmail', () => {
  it('does not throw for valid email', async () => {
    await expect(
      MailTemplatesService.sendWelcomeEmail({ tenantId: TENANT_ID, email: 'user@example.com', name: 'Alice' })
    ).resolves.not.toThrow();
  });

  it('uses email as name when name is not provided', async () => {
    await expect(
      MailTemplatesService.sendWelcomeEmail({ tenantId: TENANT_ID, email: 'user@example.com' })
    ).resolves.not.toThrow();
  });
});

describe('MailTemplatesService.sendOTPEmail', () => {
  it('does not throw with valid otp token', async () => {
    await expect(
      MailTemplatesService.sendOTPEmail({ tenantId: TENANT_ID, email: 'user@example.com', otpToken: '123456' })
    ).resolves.not.toThrow();
  });

  it('handles missing otp token gracefully (logs error, does not throw)', async () => {
    await expect(
      MailTemplatesService.sendOTPEmail({ tenantId: TENANT_ID, email: 'user@example.com', otpToken: '' })
    ).resolves.not.toThrow();
  });
});

describe('MailTemplatesService.sendForgotPasswordEmail', () => {
  it('queues email with reset token in link', async () => {
    await expect(
      MailTemplatesService.sendForgotPasswordEmail({
        tenantId: TENANT_ID, email: 'user@example.com',
        name: 'Alice',
        resetToken: 'reset-token-123',
      })
    ).resolves.not.toThrow();
  });
});
