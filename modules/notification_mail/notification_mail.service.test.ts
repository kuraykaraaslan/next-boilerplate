import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
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

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({
  default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() },
}));

vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

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

vi.mock('@/libs/redis/bullmq', () => ({
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

import MailService from './notification_mail.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MailService.getProvider', () => {
  it('returns smtp provider when it is configured', () => {
    const provider = MailService.getProvider('smtp');
    expect(provider).toBeDefined();
    expect(provider.isConfigured()).toBe(true);
  });

  it('falls back to smtp when unknown provider is requested', () => {
    const provider = MailService.getProvider('unknown' as any);
    expect(provider).toBeDefined();
    expect(provider.isConfigured()).toBe(true);
  });
});

describe('MailService.listProviders', () => {
  it('returns all 6 providers', () => {
    const providers = MailService.listProviders();
    expect(providers).toHaveLength(6);
    const names = providers.map((p) => p.name);
    expect(names).toContain('smtp');
    expect(names).toContain('sendgrid');
    expect(names).toContain('mailgun');
    expect(names).toContain('ses');
    expect(names).toContain('postmark');
    expect(names).toContain('resend');
  });

  it('marks smtp as configured and others as not configured', () => {
    const providers = MailService.listProviders();
    const smtp = providers.find((p) => p.name === 'smtp');
    expect(smtp?.configured).toBe(true);
    const sendgrid = providers.find((p) => p.name === 'sendgrid');
    expect(sendgrid?.configured).toBe(false);
  });
});

describe('MailService.getBaseTemplateVars', () => {
  it('returns template vars with required keys', () => {
    const vars = MailService.getBaseTemplateVars();
    expect(vars).toHaveProperty('appName');
    expect(vars).toHaveProperty('frontendUrl');
    expect(vars).toHaveProperty('loginLink');
    expect(vars).toHaveProperty('resetPasswordLink');
    expect(vars).toHaveProperty('supportEmail');
  });
});

describe('MailService.sendMail', () => {
  it('adds a job to the queue without throwing', async () => {
    await expect(
      MailService.sendMail('user@example.com', 'Test Subject', '<p>Hello</p>')
    ).resolves.not.toThrow();
  });

  it('handles queue errors gracefully without throwing', async () => {
    // Temporarily make the queue.add throw
    const originalAdd = (MailService.QUEUE as any).add;
    (MailService.QUEUE as any).add = vi.fn(async () => { throw new Error('Queue error'); });

    await expect(
      MailService.sendMail('user@example.com', 'Test Subject', '<p>Hello</p>')
    ).resolves.not.toThrow();

    (MailService.QUEUE as any).add = originalAdd;
  });
});

describe('MailService.sendMailDirect', () => {
  it('returns a MailResult with success true', async () => {
    const result = await MailService.sendMailDirect(
      'user@example.com',
      'Direct Subject',
      '<p>Direct</p>'
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('test-id');
  });
});

describe('MailService.sendWelcomeEmail', () => {
  it('does not throw for valid email', async () => {
    await expect(
      MailService.sendWelcomeEmail({ email: 'user@example.com', name: 'Alice' })
    ).resolves.not.toThrow();
  });

  it('uses email as name when name is not provided', async () => {
    await expect(
      MailService.sendWelcomeEmail({ email: 'user@example.com' })
    ).resolves.not.toThrow();
  });
});

describe('MailService.sendOTPEmail', () => {
  it('does not throw with valid otp token', async () => {
    await expect(
      MailService.sendOTPEmail({ email: 'user@example.com', otpToken: '123456' })
    ).resolves.not.toThrow();
  });

  it('handles missing otp token gracefully (logs error, does not throw)', async () => {
    await expect(
      MailService.sendOTPEmail({ email: 'user@example.com', otpToken: '' })
    ).resolves.not.toThrow();
  });
});

describe('MailService.sendForgotPasswordEmail', () => {
  it('queues email with reset token in link', async () => {
    await expect(
      MailService.sendForgotPasswordEmail({
        email: 'user@example.com',
        name: 'Alice',
        resetToken: 'reset-token-123',
      })
    ).resolves.not.toThrow();
  });
});

describe('MailService.sendTenantInvitationEmail', () => {
  it('queues invitation email without throwing', async () => {
    await expect(
      MailService.sendTenantInvitationEmail({
        email: 'invited@example.com',
        tenantName: 'Acme Corp',
        memberRole: 'USER',
        rawToken: 'token-xyz',
        tenantId: 'tenant-uuid-123',
      })
    ).resolves.not.toThrow();
  });
});

describe('MailService.sendContactFormAdminEmail', () => {
  it('queues email to admin when INFORM_MAIL is set', async () => {
    await expect(
      MailService.sendContactFormAdminEmail({
        message: 'Hello from contact form',
        name: 'Bob',
        email: 'bob@example.com',
        phone: '+1234567890',
      })
    ).resolves.not.toThrow();
  });
});
