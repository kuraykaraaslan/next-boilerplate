import { describe, it, expect, vi } from 'vitest';

// Prevent real infra connections when importing the service graph.
vi.mock('@nb/env', () => ({ env: { REDIS_URL: 'redis://test', NODE_ENV: 'test' } }));
vi.mock('@nb/redis', () => ({ default: { publish: vi.fn(async () => 0) } }));
vi.mock('@nb/db', () => ({ tenantDataSourceFor: vi.fn() }));
vi.mock('@nb/setting/server/setting.service', () => ({ default: { getByKeys: vi.fn(async () => ({})) } }));

import MessagingModerationService from '../messaging.moderation.service';

describe('compileKeywords', () => {
  it('splits literals and regexes, lowercasing literals', () => {
    const kw = MessagingModerationService.compileKeywords('["BadWord","/sc[a4]m/i"]');
    expect(kw.literals).toEqual(['badword']);
    expect(kw.regexes).toHaveLength(1);
  });
  it('returns empty on invalid JSON', () => {
    expect(MessagingModerationService.compileKeywords('not json')).toEqual({ literals: [], regexes: [] });
  });
});

describe('scanText', () => {
  const kw = MessagingModerationService.compileKeywords('["spam","/\\\\bscam\\\\b/i"]');

  it('matches a literal case-insensitively', () => {
    expect(MessagingModerationService.scanText('This is SPAM!', kw).flagged).toBe(true);
  });
  it('matches a regex', () => {
    expect(MessagingModerationService.scanText('total scam here', kw).flagged).toBe(true);
  });
  it('passes clean text', () => {
    const r = MessagingModerationService.scanText('a perfectly nice message', kw);
    expect(r.flagged).toBe(false);
    expect(r.matched).toEqual([]);
  });
});

describe('applyPolicy', () => {
  const clean = { flagged: false, matched: [] as string[] };
  const hit = { flagged: true, matched: ['spam'] };
  const noAi = { useAi: false, aiHold: false, aiAvailable: true };

  it('OFF never scans → CLEAN', () => {
    expect(MessagingModerationService.applyPolicy('OFF', hit, noAi)).toMatchObject({ status: 'CLEAN', held: false });
  });
  it('LOG violation → FLAGGED, delivered', () => {
    expect(MessagingModerationService.applyPolicy('LOG', hit, noAi)).toMatchObject({ status: 'FLAGGED', held: false });
  });
  it('REPORT violation → FLAGGED, delivered', () => {
    expect(MessagingModerationService.applyPolicy('REPORT', hit, noAi)).toMatchObject({ status: 'FLAGGED', held: false });
  });
  it('AUTO violation → PENDING, held', () => {
    expect(MessagingModerationService.applyPolicy('AUTO', hit, noAi)).toMatchObject({ status: 'PENDING', held: true, runAi: false });
  });
  it('AUTO + aiHold + clean + AI available → PENDING held awaiting AI', () => {
    const d = MessagingModerationService.applyPolicy('AUTO', clean, { useAi: true, aiHold: true, aiAvailable: true });
    expect(d).toMatchObject({ status: 'PENDING', held: true, runAi: true });
  });
  it('AUTO + useAi (no hold) + clean → delivered, async AI backstop', () => {
    const d = MessagingModerationService.applyPolicy('AUTO', clean, { useAi: true, aiHold: false, aiAvailable: true });
    expect(d).toMatchObject({ status: 'CLEAN', held: false, runAi: true });
  });
  it('useAi but no worker available → no AI scheduled', () => {
    const d = MessagingModerationService.applyPolicy('AUTO', clean, { useAi: true, aiHold: true, aiAvailable: false });
    expect(d).toMatchObject({ status: 'CLEAN', held: false, runAi: false });
  });
});
