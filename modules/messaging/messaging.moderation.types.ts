import type { ModerationMode, MessageModerationStatus } from './messaging.enums';

export interface CompiledKeywords {
  literals: string[]; // already lowercased
  regexes: RegExp[];
}

export interface ModerationPolicy {
  mode: ModerationMode;
  keywords: CompiledKeywords;
  useAi: boolean;
  aiHold: boolean;
  aiThreshold: number;
  reportThreshold: number;
}

export interface ScanResult {
  flagged: boolean;
  matched: string[];
}

export interface PolicyDecision {
  status: MessageModerationStatus;
  reason: string | null;
  held: boolean;
  runAi: boolean;
}
