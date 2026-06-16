import SettingService from '@nb/setting/server/setting.service';
import type { ModerationMode } from './messaging.enums';
import {
  MESSAGING_MODERATION_KEYS,
  MESSAGING_MODERATION_DEFAULTS,
} from './messaging.moderation.setting.keys';
import type { CompiledKeywords, ModerationPolicy, ScanResult, PolicyDecision } from './messaging.moderation.types';

export async function loadPolicy(tenantId: string): Promise<ModerationPolicy> {
  const raw = await SettingService.getByKeys(tenantId, MESSAGING_MODERATION_KEYS).catch(
    () => ({} as Record<string, string>),
  );
  const get = (k: keyof typeof MESSAGING_MODERATION_DEFAULTS): string =>
    raw[k] ?? MESSAGING_MODERATION_DEFAULTS[k];

  return {
    mode: get('messagingModerationMode') as ModerationMode,
    keywords: compileKeywords(get('messagingModerationKeywords')),
    useAi: get('messagingModerationUseAi') === 'true',
    aiHold: get('messagingModerationAiHold') === 'true',
    aiThreshold: Number(get('messagingModerationAiThreshold')) || 70,
    reportThreshold: Number(get('messagingModerationReportThreshold')) || 0,
  };
}

/** Parse a JSON array of blocklist entries into literals + compiled regexes. */
export function compileKeywords(json: string): CompiledKeywords {
  const out: CompiledKeywords = { literals: [], regexes: [] };
  let entries: unknown;
  try {
    entries = JSON.parse(json);
  } catch {
    return out;
  }
  if (!Array.isArray(entries)) return out;
  for (const e of entries) {
    if (typeof e !== 'string' || !e.trim()) continue;
    const m = e.match(/^\/(.*)\/([a-z]*)$/);
    if (m) {
      try {
        out.regexes.push(new RegExp(m[1], m[2].includes('i') ? m[2] : m[2] + 'i'));
      } catch {
        /* skip invalid regex */
      }
    } else {
      out.literals.push(e.toLowerCase());
    }
  }
  return out;
}

// ─── Pure scan + decision (no I/O — unit-tested directly) ─────────────────────

export function scanText(body: string, keywords: CompiledKeywords): ScanResult {
  const matched: string[] = [];
  const lower = body.toLowerCase();
  for (const lit of keywords.literals) {
    if (lit && lower.includes(lit)) matched.push(lit);
  }
  for (const re of keywords.regexes) {
    if (re.test(body)) matched.push(re.source);
  }
  return { flagged: matched.length > 0, matched };
}

export function applyPolicy(
  mode: ModerationMode,
  scan: ScanResult,
  opts: { useAi: boolean; aiHold: boolean; aiAvailable: boolean },
): PolicyDecision {
  if (mode === 'OFF') return { status: 'CLEAN', reason: null, held: false, runAi: false };

  if (scan.flagged) {
    // Deterministic hit — act immediately, don't spend AI tokens re-confirming.
    if (mode === 'AUTO') return { status: 'PENDING', reason: 'keyword', held: true, runAi: false };
    return { status: 'FLAGGED', reason: 'keyword', held: false, runAi: false };
  }

  // Keyword-clean: maybe run the AI backstop.
  const canAi = opts.useAi && opts.aiAvailable;
  if (canAi && mode === 'AUTO' && opts.aiHold) {
    return { status: 'PENDING', reason: null, held: true, runAi: true };
  }
  return { status: 'CLEAN', reason: null, held: false, runAi: canAi };
}
