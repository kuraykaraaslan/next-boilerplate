import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { ConnectedApp as ConnectedAppEntity } from './entities/connected_app.entity';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from './integrations_hub.messages';
import type { FireTriggerDTO } from './integrations_hub.dto';
import IntegrationsHubConnectorService from './integrations_hub.connector.service';

/**
 * Outbound triggers. A trigger fire is bridged onto the webhook system as an
 * `integration.trigger_fired` event (carrying the connector + event key), so the
 * connector's provisioned webhook endpoint receives it with the webhook
 * module's signing / retry / circuit-breaker guarantees intact.
 */
export default class IntegrationsHubTriggerService {
  static async fireTrigger(
    tenantId: string,
    data: FireTriggerDTO,
  ): Promise<{ dispatched: number }> {
    const connector = await IntegrationsHubConnectorService.getConnectorEntity(tenantId, data.connectorKey);
    if (!connector.isEnabled) throw new AppError(MSG.CONNECTOR_DISABLED, 409, ErrorCode.CONFLICT);

    const ds = await tenantDataSourceFor(tenantId);
    const apps = await ds.getRepository(ConnectedAppEntity).find({
      where: { tenantId, connectorKey: data.connectorKey, status: 'CONNECTED' },
    });
    if (apps.length === 0) throw new AppError(MSG.CONNECTED_APP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const eventPayload = {
      connectorKey: data.connectorKey,
      eventKey: data.eventKey,
      data: data.payload,
    };

    let dispatched = 0;
    for (const app of apps) {
      try {
        await WebhookService.dispatchEvent(tenantId, 'integration.trigger_fired', eventPayload);
        await IntegrationsHubConnectorService.recordEvent(
          tenantId, app.connectedAppId, 'OUTBOUND', data.eventKey, 'SUCCESS', data.payload,
        );
        dispatched += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        await IntegrationsHubConnectorService.recordEvent(
          tenantId, app.connectedAppId, 'OUTBOUND', data.eventKey, 'FAILED', data.payload, message,
        );
        await WebhookService.dispatchEvent(tenantId, 'integration.error', {
          connectorKey: data.connectorKey, eventKey: data.eventKey, error: message,
        }).catch(() => {});
        Logger.warn(`[integrations_hub] trigger dispatch failed for ${app.connectedAppId}: ${message}`);
      }
    }

    return { dispatched };
  }
}
