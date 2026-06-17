import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import Logger from '@kuraykaraaslan/logger';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import ApiKeyService from '@kuraykaraaslan/api_key/server/api_key.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { Connector as ConnectorEntity } from './entities/connector.entity';
import { ConnectedApp as ConnectedAppEntity } from './entities/connected_app.entity';
import { IntegrationEvent as IntegrationEventEntity } from './entities/integration_event.entity';
import { OAuthToken as OAuthTokenEntity } from './entities/oauth_token.entity';
import { ConnectorSchema, ConnectedAppSchema, IntegrationEventSchema } from './integrations_hub.types';
import type { Connector, ConnectedApp, IntegrationEvent } from './integrations_hub.types';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from './integrations_hub.messages';
import type { UpsertConnectorDTO, ConnectApiKeyDTO, ListConnectedAppsQuery } from './integrations_hub.dto';

/**
 * Connector catalog + connected-app lifecycle. Outbound delivery and inbound
 * auth are delegated to the webhook and api_key modules respectively — this
 * service owns the catalog, connection state, and the event audit trail.
 */
export default class IntegrationsHubConnectorService {
  // ── Connector catalog ──────────────────────────────────────────────────────

  static async listConnectors(tenantId: string): Promise<Connector[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds.getRepository(ConnectorEntity).find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
    return rows.map((r) => ConnectorSchema.parse(r));
  }

  static async getConnector(tenantId: string, key: string): Promise<Connector> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(ConnectorEntity).findOne({ where: { tenantId, key } });
    if (!row) throw new AppError(MSG.CONNECTOR_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return ConnectorSchema.parse(row);
  }

  /** Internal: load the raw connector entity (keeps client-secret setting keys). */
  static async getConnectorEntity(tenantId: string, key: string): Promise<ConnectorEntity> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(ConnectorEntity).findOne({ where: { tenantId, key } });
    if (!row) throw new AppError(MSG.CONNECTOR_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return row;
  }

  static async upsertConnector(tenantId: string, data: UpsertConnectorDTO): Promise<Connector> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(ConnectorEntity);
      const existing = await repo.findOne({ where: { tenantId, key: data.key } });
      const entity = existing ?? repo.create({ tenantId, key: data.key });
      entity.name = data.name;
      entity.category = data.category;
      entity.authType = data.authType;
      entity.iconUrl = data.iconUrl;
      entity.isEnabled = data.isEnabled;
      entity.triggers = data.triggers;
      entity.actions = data.actions;
      entity.oauthAuthUrl = data.oauthAuthUrl;
      entity.oauthTokenUrl = data.oauthTokenUrl;
      entity.oauthScopes = data.oauthScopes;
      entity.clientIdSettingKey = data.clientIdSettingKey;
      entity.clientSecretSettingKey = data.clientSecretSettingKey;
      const saved = await repo.save(entity);
      return ConnectorSchema.parse(saved);
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${MSG.CONNECTOR_SAVE_FAILED}: ${error}`);
      throw new AppError(MSG.CONNECTOR_SAVE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async deleteConnector(tenantId: string, key: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ConnectorEntity);
    const existing = await repo.findOne({ where: { tenantId, key } });
    if (!existing) throw new AppError(MSG.CONNECTOR_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.delete({ tenantId, key });
  }

  // ── Connected apps ───────────────────────────────────────────────────────────

  static async listConnectedApps(
    tenantId: string,
    query: ListConnectedAppsQuery,
  ): Promise<{ connectedApps: ConnectedApp[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { tenantId };
    if (query.connectorKey) where.connectorKey = query.connectorKey;
    if (query.status) where.status = query.status;
    const [rows, total] = await ds.getRepository(ConnectedAppEntity).findAndCount({
      where,
      skip: query.page * query.pageSize,
      take: query.pageSize,
      order: { createdAt: 'DESC' },
    });
    return { connectedApps: rows.map((r) => ConnectedAppSchema.parse(r)), total };
  }

  static async getConnectedApp(tenantId: string, connectedAppId: string): Promise<ConnectedApp> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(ConnectedAppEntity).findOne({ where: { tenantId, connectedAppId } });
    if (!row) throw new AppError(MSG.CONNECTED_APP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return ConnectedAppSchema.parse(row);
  }

  /**
   * Connect an API-key connector: mint a scoped API key (returned once),
   * optionally provision an outbound webhook for the connector's triggers, and
   * record the connection.
   */
  static async connectApiKey(
    tenantId: string,
    userId: string,
    data: ConnectApiKeyDTO,
  ): Promise<{ connectedApp: ConnectedApp; rawKey: string }> {
    const connector = await this.getConnectorEntity(tenantId, data.connectorKey);
    if (!connector.isEnabled) throw new AppError(MSG.CONNECTOR_DISABLED, 409, ErrorCode.CONFLICT);
    if (connector.authType !== 'API_KEY' && connector.authType !== 'WEBHOOK_ONLY') {
      throw new AppError(MSG.API_KEY_NOT_SUPPORTED, 422, ErrorCode.VALIDATION_ERROR);
    }
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(ConnectedAppEntity);

      const { key, rawKey } = await ApiKeyService.create(tenantId, userId, {
        name: `Integration: ${connector.name}`,
        scopes: data.scopes,
      });

      const app = repo.create({
        tenantId,
        connectorKey: data.connectorKey,
        status: 'CONNECTED',
        connectedByUserId: userId,
        externalAccountId: data.externalAccountId,
        externalAccountName: data.externalAccountName,
        apiKeyId: key.apiKeyId,
        config: data.config,
        lastSyncAt: new Date(),
      });
      const saved = await repo.save(app);

      await WebhookService.dispatchEvent(tenantId, 'integration.connected', {
        connectorKey: data.connectorKey,
        connectedAppId: saved.connectedAppId,
        authType: 'API_KEY',
      }).catch(() => {});

      return { connectedApp: ConnectedAppSchema.parse(saved), rawKey };
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${MSG.CONNECT_FAILED}: ${error}`);
      throw new AppError(MSG.CONNECT_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /** Disconnect a connected app and clean up its tokens (best-effort). */
  static async disconnect(tenantId: string, connectedAppId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ConnectedAppEntity);
    const app = await repo.findOne({ where: { tenantId, connectedAppId } });
    if (!app) throw new AppError(MSG.CONNECTED_APP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    try {
      app.status = 'DISCONNECTED';
      await repo.save(app);
      await ds.getRepository(OAuthTokenEntity).delete({ tenantId, connectedAppId }).catch(() => {});
      if (app.apiKeyId) {
        await ApiKeyService.delete(tenantId, app.apiKeyId).catch(() => {});
      }
      await WebhookService.dispatchEvent(tenantId, 'integration.disconnected', {
        connectorKey: app.connectorKey,
        connectedAppId,
      }).catch(() => {});
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${MSG.DISCONNECT_FAILED}: ${error}`);
      throw new AppError(MSG.DISCONNECT_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  // ── Event audit ────────────────────────────────────────────────────────────

  static async recordEvent(
    tenantId: string,
    connectedAppId: string,
    direction: 'OUTBOUND' | 'INBOUND',
    eventKey: string,
    status: 'SUCCESS' | 'FAILED',
    payload?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(IntegrationEventEntity).save(
      ds.getRepository(IntegrationEventEntity).create({
        tenantId, connectedAppId, direction, eventKey, status, payload, error,
      }),
    ).catch((e) => Logger.warn(`[integrations_hub] failed to record event: ${e}`));
  }

  static async listEvents(tenantId: string, connectedAppId: string, limit = 100): Promise<IntegrationEvent[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds.getRepository(IntegrationEventEntity).find({
      where: { tenantId, connectedAppId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map((r) => IntegrationEventSchema.parse(r));
  }
}
