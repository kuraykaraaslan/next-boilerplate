import 'reflect-metadata';
import { tenantDataSourceFor } from '@nb/db';
import ApiKeyService from '@nb/api_key/server/api_key.service';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { ConnectedApp as ConnectedAppEntity } from './entities/connected_app.entity';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from './integrations_hub.messages';
import IntegrationsHubConnectorService from './integrations_hub.connector.service';

/**
 * Inbound actions. A third-party calls in with the API key minted at connect
 * time; we authenticate it via the api_key module, resolve the owning connected
 * app, validate the action against the connector catalog, and record the call.
 * The actual action handler is connector-specific; v1 authenticates, validates
 * and audits, returning an acknowledgement.
 */
export default class IntegrationsHubActionService {
  static async handleInboundAction(
    tenantId: string,
    rawKey: string,
    actionKey: string,
    payload: Record<string, unknown>,
    ctx?: { ip?: string },
  ): Promise<{ accepted: boolean; actionKey: string; connectedAppId: string }> {
    // Authenticate the inbound key (requires write scope).
    const key = await ApiKeyService.verify(rawKey, 'write', ctx);
    if (key.tenantId !== tenantId) {
      throw new AppError(MSG.CONNECTED_APP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    }

    const ds = await tenantDataSourceFor(tenantId);
    const app = await ds.getRepository(ConnectedAppEntity).findOne({
      where: { tenantId, apiKeyId: key.apiKeyId, status: 'CONNECTED' },
    });
    if (!app) throw new AppError(MSG.CONNECTED_APP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const connector = await IntegrationsHubConnectorService.getConnectorEntity(tenantId, app.connectorKey);
    const known = (connector.actions ?? []).some((a) => a.key === actionKey);
    if (!known) {
      await IntegrationsHubConnectorService.recordEvent(
        tenantId, app.connectedAppId, 'INBOUND', actionKey, 'FAILED', payload, MSG.ACTION_NOT_FOUND,
      );
      throw new AppError(MSG.ACTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    }

    await IntegrationsHubConnectorService.recordEvent(
      tenantId, app.connectedAppId, 'INBOUND', actionKey, 'SUCCESS', payload,
    );

    return { accepted: true, actionKey, connectedAppId: app.connectedAppId };
  }
}
