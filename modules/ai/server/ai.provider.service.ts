import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { extensionRegistry, type RuntimeExtension } from '@kuraykaraaslan/common/server/extension-registry';
import { getEnabledModuleIds } from '@kuraykaraaslan/setting/server/module-activation.service.next';
import type BaseAIProvider from './providers/base.provider';
import type { AIProviderContribution } from './ai.provider.types';
import type { AIProviderType, AIModel } from './ai.types';
import AiMessages from './ai.messages';

/** The extension point satellite provider modules contribute into. */
const AI_PROVIDER_POINT = 'ai:provider';

/** Code-free view of a provider contribution, taken from the manifest metadata. */
interface ProviderMeta {
  key: string;
  label?: string;
  models: string[];
  order: number;
  moduleId: string;
}

function metaOf(c: RuntimeExtension): ProviderMeta {
  const md = c.metadata ?? {};
  return {
    key: c.key ?? String(md.key ?? ''),
    label: typeof md.label === 'string' ? md.label : undefined,
    models: Array.isArray(md.models) ? (md.models as string[]) : [],
    order: c.order,
    moduleId: c.moduleId,
  };
}

/**
 * Resolves and caches AI provider instances per tenant. Providers are not
 * hardcoded: they are discovered from the extension registry (point
 * `ai:provider`) and gated by the tenant's enabled-module set, so enabling or
 * disabling a satellite module (e.g. `ai_anthropic`) adds or removes a provider
 * with no host change. Gating is enforced live on every call; the cache only
 * holds already-built instances and is keyed by (tenant, providerKey).
 */
export default class AIProviderService {

  private static readonly FALLBACK_DEFAULT_PROVIDER: AIProviderType =
    (env.AI_DEFAULT_PROVIDER as AIProviderType) || 'openai';

  // tenantId -> (providerKey -> instance)
  private static readonly _tenantProviders = new Map<string, Map<string, BaseAIProvider>>();

  // ──────────────────────────────────────────────
  // Discovery (manifest-metadata only — no satellite code loaded)
  // ──────────────────────────────────────────────

  /** Enabled provider contributions for a tenant. */
  private static async enabledContributions(tenantId: string): Promise<RuntimeExtension[]> {
    const enabledIds = await getEnabledModuleIds(tenantId);
    return extensionRegistry.getContributions(AI_PROVIDER_POINT, { enabledIds });
  }

  private static async enabledMetas(tenantId: string): Promise<ProviderMeta[]> {
    return (await AIProviderService.enabledContributions(tenantId)).map(metaOf).filter((m) => m.key);
  }

  private static async resolveDefaultKey(tenantId: string, metas: ProviderMeta[]): Promise<string | undefined> {
    if (metas.length === 0) return undefined;
    const rec = await SettingService.getByKeys(tenantId, ['aiDefaultProvider']).catch(() => ({} as Record<string, string>));
    const want = rec.aiDefaultProvider || AIProviderService.FALLBACK_DEFAULT_PROVIDER;
    if (metas.some((m) => m.key === want)) return want;
    return metas[0].key; // lowest-order enabled provider
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
        // Explicit choice that is unknown or disabled for this tenant.
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

  /** Load the contribution implementation and instantiate it from tenant settings. */
  private static async build(tenantId: string, key: string): Promise<BaseAIProvider> {
    const contrib = (await AIProviderService.enabledContributions(tenantId)).find(
      (c) => (c.key ?? c.metadata?.key) === key,
    );
    if (!contrib) {
      throw new AppError(`${AiMessages.PROVIDER_NOT_CONFIGURED}: "${key}"`, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }
    const impl = await extensionRegistry.load<AIProviderContribution>(contrib);
    const settings = await SettingService.getByKeys(tenantId, [...impl.settingKeys]);
    const config = impl.resolveConfig(settings);
    return impl.create(config);
  }

  static async getDefaultProvider(tenantId: string): Promise<BaseAIProvider> {
    return AIProviderService.getProvider(tenantId);
  }

  /** Provider keys enabled for the tenant (lowest-order first). */
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
        // disabled/unbuildable — skip
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

  static async listModels(tenantId: string, providerType?: AIProviderType): Promise<string[]> {
    const provider = await AIProviderService.getProvider(tenantId, providerType);
    return provider.listModels();
  }

  /** Models per enabled provider for the tenant, from manifest metadata (no code load). */
  static async listAllModels(tenantId: string): Promise<Record<string, string[]>> {
    const metas = await AIProviderService.enabledMetas(tenantId);
    const out: Record<string, string[]> = {};
    for (const m of metas) out[m.key] = m.models;
    return out;
  }

  /**
   * Resolve which provider serves a model id, scanning ALL registered providers'
   * declared models (not just the tenant's enabled set) so a model belonging to
   * a disabled provider still maps to it — `getProvider` then rejects it cleanly
   * rather than silently routing to the wrong provider. Returns null if no
   * provider claims the model.
   */
  static getProviderForModel(model: AIModel): AIProviderType | null {
    const all = extensionRegistry.getContributions(AI_PROVIDER_POINT);
    for (const c of all) {
      const m = metaOf(c);
      if (m.key && m.models.includes(model)) return m.key;
    }
    return null;
  }

  /** Drop cached provider instances for a tenant (call after a settings change). */
  static invalidateTenant(tenantId: string): void {
    AIProviderService._tenantProviders.delete(tenantId);
    Logger.info(`AIProviderService: invalidated provider cache for tenant ${tenantId}`);
  }
}
