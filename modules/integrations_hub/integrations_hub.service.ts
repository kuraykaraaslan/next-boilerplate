import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import IntegrationsHubConnectorService from './integrations_hub.connector.service';
import IntegrationsHubOAuthService from './integrations_hub.oauth.service';
import IntegrationsHubTriggerService from './integrations_hub.trigger.service';
import IntegrationsHubActionService from './integrations_hub.action.service';
import type { ConnectApiKeyDTO } from './integrations_hub.dto';

export {
  IntegrationsHubConnectorService,
  IntegrationsHubOAuthService,
  IntegrationsHubTriggerService,
  IntegrationsHubActionService,
};

/**
 * Facade for the integrations hub. Connector catalog + connection state live in
 * the connector service; OAuth in the oauth service; outbound triggers bridge to
 * the webhook module; inbound actions authenticate via the api_key module.
 *
 * Establishing a connection (`connectApiKey` / `completeOAuthConnect`) is gated
 * behind `FEATURE_KEYS.FEATURE_INTEGRATIONS`; the root tenant bypasses.
 */
export default class IntegrationsHubService {
  // Connector catalog
  static listConnectors = IntegrationsHubConnectorService.listConnectors.bind(IntegrationsHubConnectorService);
  static getConnector = IntegrationsHubConnectorService.getConnector.bind(IntegrationsHubConnectorService);
  static upsertConnector = IntegrationsHubConnectorService.upsertConnector.bind(IntegrationsHubConnectorService);
  static deleteConnector = IntegrationsHubConnectorService.deleteConnector.bind(IntegrationsHubConnectorService);

  // Connected apps
  static listConnectedApps = IntegrationsHubConnectorService.listConnectedApps.bind(IntegrationsHubConnectorService);
  static getConnectedApp = IntegrationsHubConnectorService.getConnectedApp.bind(IntegrationsHubConnectorService);
  static disconnect = IntegrationsHubConnectorService.disconnect.bind(IntegrationsHubConnectorService);
  static listEvents = IntegrationsHubConnectorService.listEvents.bind(IntegrationsHubConnectorService);

  static async connectApiKey(tenantId: string, userId: string, data: ConnectApiKeyDTO) {
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_INTEGRATIONS);
    return IntegrationsHubConnectorService.connectApiKey(tenantId, userId, data);
  }

  // OAuth
  static beginOAuthConnect = IntegrationsHubOAuthService.beginOAuthConnect.bind(IntegrationsHubOAuthService);
  static getAccessToken = IntegrationsHubOAuthService.getAccessToken.bind(IntegrationsHubOAuthService);
  static refreshTokenIfNeeded = IntegrationsHubOAuthService.refreshTokenIfNeeded.bind(IntegrationsHubOAuthService);

  static async completeOAuthConnect(tenantId: string, data: { code: string; state: string }) {
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_INTEGRATIONS);
    return IntegrationsHubOAuthService.completeOAuthConnect(tenantId, data);
  }

  // Triggers / actions
  static fireTrigger = IntegrationsHubTriggerService.fireTrigger.bind(IntegrationsHubTriggerService);
  static handleInboundAction = IntegrationsHubActionService.handleInboundAction.bind(IntegrationsHubActionService);
}
