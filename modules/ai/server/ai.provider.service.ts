import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import redis, { singleFlight, tenantKey } from '@kuraykaraaslan/redis';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { listExternalContributions } from '@kuraykaraaslan/common/server/external-extensions';
import type BaseAIProvider from './providers/base.provider';
import type { AIProviderType, AIModel } from './ai.types';
import { IsolatedAIProvider } from './providers/isolated.provider';
import AiMessages from './ai.messages';

/** Host extension point AI providers contribute into (sandboxed community plugins). */
const AI_PROVIDER_POINT = 'ai:provider';

/** Code-free view of a provider contribution, taken from the manifest metadata. */
interface ProviderMeta {
  key: string;
  label?: string;
  models: string[];
}

/**
 * Resolves and caches AI provider instances per tenant. Providers are SANDBOXED
 * community plugins (the @<vendor>/* family) discovered per-tenant via the
 * external-contributions bridge — there is no in-tree built-in fallback, so every
 * provider is external. The cache holds already-built `IsolatedAIProvider`
 * instances keyed by (tenant, providerKey).
 */
export default class AIProviderService {

  private static readonly FALLBACK_DEFAULT_PROVIDER: AIProviderType =
    (env.AI_DEFAULT_PROVIDER as AIProviderType) || 'openai';

  // Model-list cache TTLs (seconds): long on a successful live fetch, short on a
  // fallback so a misconfigured/rate-limited provider recovers quickly.
  private static readonly MODELS_TTL_OK = Number(env.AI_MODELS_CACHE_TTL ?? 21600); // 6h
  private static readonly MODELS_TTL_FAIL = 300; // 5m

  // tenantId -> (providerKey -> instance)
  private static readonly _tenantProviders = new Map<string, Map<string, BaseAIProvider>>();

  // ──────────────────────────────────────────────
  // Discovery (manifest-metadata only — no code loaded)
  // ──────────────────────────────────────────────

  /** Installed sandboxed community providers for a tenant (manifest metadata). */
  private static async enabledMetas(tenantId: string): Promise<ProviderMeta[]> {
    return (await listExternalContributions(tenantId, AI_PROVIDER_POINT))
      .map((c) => ({
        key: c.key,
        label: typeof c.metadata.label === 'string' ? c.metadata.label : undefined,
        models: Array.isArray(c.metadata.models) ? (c.metadata.models as string[]) : [],
      }))
      .filter((m) => m.key);
  }

  private static async resolveDefaultKey(tenantId: string, metas: ProviderMeta[]): Promise<string | undefined> {
    if (metas.length === 0) return undefined;
    const rec = await SettingService.getByKeys(tenantId, ['aiDefaultProvider']).catch(() => ({} as Record<string, string>));
    const want = rec.aiDefaultProvider || AIProviderService.FALLBACK_DEFAULT_PROVIDER;
    if (metas.some((m) => m.key === want)) return want;
    return metas[0].key;
  }

  // ──────────────────────────────────────────────
  // Public Methods
  // ──────────────────────────────────────────────

  static async getProvider(tenantId: string, providerType?: AIProviderType): Promise<BaseAIProvider> {
    const metas = await AIProviderService.enabledMetas(tenantId);
    if (metas.length === 0) {
      throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }

    let key: string | undefined;
    if (providerType) {
      if (!metas.some((m) => m.key === providerType)) {
        throw new AppError(`${AiMessages.PROVIDER_NOT_CONFIGURED}: "${providerType}"`, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
      }
      key = providerType;
    } else {
      key = await AIProviderService.resolveDefaultKey(tenantId, metas);
    }
    if (!key) {
      throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }

    let perTenant = AIProviderService._tenantProviders.get(tenantId);
    if (!perTenant) {
      perTenant = new Map<string, BaseAIProvider>();
      AIProviderService._tenantProviders.set(tenantId, perTenant);
    }
    let instance = perTenant.get(key);
    if (!instance) {
      instance = await AIProviderService.build(tenantId, key);
      perTenant.set(key, instance);
    }
    return instance;
  }

  /** Wrap the sandboxed community contribution's invoke() in the host-facing facade. */
  private static async build(tenantId: string, key: string): Promise<BaseAIProvider> {
    const external = (await listExternalContributions(tenantId, AI_PROVIDER_POINT)).find((c) => c.key === key);
    if (!external) {
      throw new AppError(`${AiMessages.PROVIDER_NOT_CONFIGURED}: "${key}"`, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }
    return new IsolatedAIProvider({
      key: external.key,
      models: Array.isArray(external.metadata.models) ? (external.metadata.models as string[]) : [],
      configured: external.configured,
      invoke: external.invoke,
    });
  }

  static async getDefaultProvider(tenantId: string): Promise<BaseAIProvider> {
    return AIProviderService.getProvider(tenantId);
  }

  /** Provider keys installed for the tenant. */
  static async listProviders(tenantId: string): Promise<AIProviderType[]> {
    return (await AIProviderService.enabledMetas(tenantId)).map((m) => m.key);
  }

  static async listConfiguredProviders(tenantId: string): Promise<AIProviderType[]> {
    const metas = await AIProviderService.enabledMetas(tenantId);
    const out: AIProviderType[] = [];
    for (const m of metas) {
      try {
        const provider = await AIProviderService.getProvider(tenantId, m.key);
        if (provider.isConfigured()) out.push(m.key);
      } catch {
        // unbuildable — skip
      }
    }
    return out;
  }

  static async isProviderConfigured(tenantId: string, providerType: AIProviderType): Promise<boolean> {
    try {
      const provider = await AIProviderService.getProvider(tenantId, providerType);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  /**
   * Live model list for a provider, cached per (tenant, providerKey) in Redis. The
   * plugin's `listModels` op fetches the provider's /models API; a successful
   * (non-empty) result is cached for MODELS_TTL_OK, otherwise the manifest `fallback`
   * is used and cached for MODELS_TTL_FAIL (retry soon). Concurrent loads are deduped
   * (singleFlight); every Redis call is fail-open.
   */
  private static async cachedModelsFor(tenantId: string, key: string, fallback: string[]): Promise<string[]> {
    const ck = tenantKey(tenantId, 'ai:models', key);
    const readCache = async (): Promise<string[] | null> => {
      try {
        const hit = await redis.get(ck);
        if (hit) { const arr = JSON.parse(hit); if (Array.isArray(arr)) return arr; }
      } catch { /* fail-open */ }
      return null;
    };
    const cached = await readCache();
    if (cached) return cached;

    return singleFlight(ck, async () => {
      const again = await readCache();
      if (again) return again;

      let models: string[] = [];
      try {
        const provider = await AIProviderService.getProvider(tenantId, key as AIProviderType);
        if (provider instanceof IsolatedAIProvider) models = await provider.listModelsRemote();
      } catch { /* unbuildable/uninstalled — fall back */ }

      const ok = models.length > 0;
      const finalList = ok ? models : fallback;
      try { await redis.set(ck, JSON.stringify(finalList), 'EX', ok ? AIProviderService.MODELS_TTL_OK : AIProviderService.MODELS_TTL_FAIL); } catch { /* fail-open */ }
      return finalList;
    });
  }

  static async listModels(tenantId: string, providerType?: AIProviderType): Promise<string[]> {
    const metas = await AIProviderService.enabledMetas(tenantId);
    if (metas.length === 0) {
      throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }
    // Resolve to a CONCRETE key so the cache entry is per real provider, not "default".
    let key: string | undefined;
    if (providerType) {
      if (!metas.some((m) => m.key === providerType)) {
        throw new AppError(`${AiMessages.PROVIDER_NOT_CONFIGURED}: "${providerType}"`, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
      }
      key = providerType;
    } else {
      key = await AIProviderService.resolveDefaultKey(tenantId, metas);
    }
    if (!key) throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    const fallback = metas.find((m) => m.key === key)?.models ?? [];
    return AIProviderService.cachedModelsFor(tenantId, key, fallback);
  }

  /** Live (cached) models per installed provider for the tenant. */
  static async listAllModels(tenantId: string): Promise<Record<string, string[]>> {
    const metas = await AIProviderService.enabledMetas(tenantId);
    const entries = await Promise.all(
      metas.map(async (m) => [m.key, await AIProviderService.cachedModelsFor(tenantId, m.key, m.models)] as const),
    );
    return Object.fromEntries(entries);
  }

  /**
   * Resolve which installed provider serves a model id. Manifest models are scanned
   * first (zero round-trip for known models); a model present only in a provider's
   * LIVE (cached) list still routes correctly. Returns null if none claims it.
   */
  static async getProviderForModel(tenantId: string, model: AIModel): Promise<AIProviderType | null> {
    const metas = await AIProviderService.enabledMetas(tenantId);
    for (const m of metas) if (m.models.includes(model)) return m.key; // fast path
    for (const m of metas) {
      const dyn = await AIProviderService.cachedModelsFor(tenantId, m.key, m.models);
      if (dyn.includes(model)) return m.key;
    }
    return null;
  }

  /** Drop cached provider instances + model-list caches for a tenant. */
  static invalidateTenant(tenantId: string): void {
    AIProviderService._tenantProviders.delete(tenantId);
    void AIProviderService.evictModelCache(tenantId); // fire-and-forget
    Logger.info(`AIProviderService: invalidated provider cache for tenant ${tenantId}`);
  }

  private static async evictModelCache(tenantId: string): Promise<void> {
    try {
      const metas = await AIProviderService.enabledMetas(tenantId);
      await Promise.all(metas.map((m) => redis.del(tenantKey(tenantId, 'ai:models', m.key)).catch(() => undefined)));
    } catch { /* best-effort */ }
  }
}
