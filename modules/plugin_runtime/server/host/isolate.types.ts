// Shared types for the plugin-host isolate runtime.
import type { Capability, Json } from '../../sdk/types';

export interface CallCtx {
  tenantId: string;
  pluginId: string;
  capabilities: Capability[];
  /** Carried through to the broker (it needs these; the isolate never sees them). */
  httpAllowlist?: string[];
  limits?: { httpTimeoutMs: number; httpMaxBytes: number };
}

/** Resolves a capability call host-side (validates + runs the scoped operation). */
export type HostDispatch = (
  ctx: CallCtx,
  capability: string,
  method: string,
  args: Json[],
) => Promise<Json>;

export interface SandboxLimits {
  memoryMb: number;
  timeoutMs: number;
}

export const DEFAULT_LIMITS: SandboxLimits = { memoryMb: 128, timeoutMs: 5000 };
