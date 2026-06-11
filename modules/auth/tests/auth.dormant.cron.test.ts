import { describe, it, expect, vi, beforeEach } from 'vitest';

// GTH-15: cover the serverless CRON_SECRET-gated path for the dormant sweep.
const { envMock, disableDormant } = vi.hoisted(() => ({
  envMock: { CRON_SECRET: 'topsecret' } as { CRON_SECRET?: string },
  disableDormant: vi.fn(async () => ({ scanned: 3, disabled: 2, erased: 1 })),
}));
vi.mock('@/modules/env', () => ({ env: envMock }));
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/modules/auth/auth.service', () => ({ default: { disableDormantAccounts: (...a: any[]) => disableDormant(...(a as [])) } }));

import { POST } from '@/app/tenant/[tenantId]/api/cron/dormant-sweep/route';

function req(headers: Record<string, string> = {}) {
  return { headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  envMock.CRON_SECRET = 'topsecret';
});

describe('POST /api/cron/dormant-sweep (CRON_SECRET gate)', () => {
  it('503 when CRON_SECRET is not configured', async () => {
    envMock.CRON_SECRET = undefined;
    const res = await POST(req());
    expect(res.status).toBe(503);
  });

  it('401 when the bearer token is wrong/absent', async () => {
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req({ authorization: 'Bearer nope' }))).status).toBe(401);
  });

  it('200 with sweep results when authorized', async () => {
    const res = await POST(req({ authorization: 'Bearer topsecret' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, scanned: 3, disabled: 2, erased: 1 });
    expect(disableDormant).toHaveBeenCalled();
  });
});
