import SettingService from '@/modules/setting/setting.service';

/**
 * Server-side helpers for the API Docs module.
 *
 * The docs UI itself is pure client rendering (see modules_next/api_doc/ui).
 * This service exposes the per-tenant visibility gate so a public route can
 * decide whether to serve docs without a session.
 */
export default class ApiDocService {
  /**
   * Whether public (session-less) API docs are enabled for a tenant.
   * Backed by the `apiDocsPublic` per-tenant setting. Defaults to false on
   * any error or when unset.
   */
  static async isPublic(tenantId: string): Promise<boolean> {
    try {
      const val = await SettingService.getValue(tenantId, 'apiDocsPublic');
      return val === 'true';
    } catch {
      return false;
    }
  }
}
