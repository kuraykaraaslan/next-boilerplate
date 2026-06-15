import 'reflect-metadata';
import crypto from 'crypto';
import { tenantDataSourceFor } from '@/modules/db';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import SettingService from '@/modules/setting/setting.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { encryptFieldOpt, decryptFieldOpt } from '@/modules/common/field-encryption';
import { ConnectedApp as ConnectedAppEntity } from './entities/connected_app.entity';
import { OAuthToken as OAuthTokenEntity } from './entities/oauth_token.entity';
import { ConnectedAppSchema } from './integrations_hub.types';
import type { ConnectedApp } from './integrations_hub.types';
import { INTEGRATIONS_HUB_MESSAGES as MSG } from './integrations_hub.messages';
import type { BeginOAuthDTO, OAuthCallbackDTO } from './integrations_hub.dto';
import IntegrationsHubConnectorService from './integrations_hub.connector.service';

interface StatePayload {
  t: string; // tenantId
  c: string; // connectorKey
  u: string; // userId
  r: string; // redirectUri
  n: string; // nonce
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

const REFRESH_SKEW_MS = 60_000; // refresh if expiring within 1 minute

export default class IntegrationsHubOAuthService {
  /** Build the provider authorize URL + opaque signed state for an OAuth connect. */
  static async beginOAuthConnect(
    tenantId: string,
    userId: string,
    data: BeginOAuthDTO,
  ): Promise<{ authorizeUrl: string; state: string }> {
    const connector = await IntegrationsHubConnectorService.getConnectorEntity(tenantId, data.connectorKey);
    if (!connector.isEnabled) throw new AppError(MSG.CONNECTOR_DISABLED, 409, ErrorCode.CONFLICT);
    if (connector.authType !== 'OAUTH2') throw new AppError(MSG.OAUTH_NOT_SUPPORTED, 422, ErrorCode.VALIDATION_ERROR);
    if (!connector.oauthAuthUrl || !connector.oauthTokenUrl || !connector.clientIdSettingKey) {
      throw new AppError(MSG.OAUTH_CONFIG_MISSING, 422, ErrorCode.VALIDATION_ERROR);
    }

    const clientId = await SettingService.getValue(tenantId, connector.clientIdSettingKey);
    if (!clientId) throw new AppError(MSG.OAUTH_CONFIG_MISSING, 422, ErrorCode.VALIDATION_ERROR);

    const payload: StatePayload = {
      t: tenantId, c: data.connectorKey, u: userId, r: data.redirectUri,
      n: crypto.randomBytes(16).toString('hex'),
    };
    const state = encryptFieldOpt(JSON.stringify(payload));

    const url = new URL(connector.oauthAuthUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', data.redirectUri);
    url.searchParams.set('state', state);
    if (connector.oauthScopes?.length) url.searchParams.set('scope', connector.oauthScopes.join(' '));

    return { authorizeUrl: url.toString(), state };
  }

  /** Handle the OAuth redirect: exchange the code, store encrypted tokens. */
  static async completeOAuthConnect(tenantId: string, data: OAuthCallbackDTO): Promise<ConnectedApp> {
    let parsed: StatePayload;
    try {
      const raw = decryptFieldOpt(data.state);
      parsed = JSON.parse(raw as string) as StatePayload;
    } catch {
      throw new AppError(MSG.OAUTH_STATE_INVALID, 400, ErrorCode.VALIDATION_ERROR);
    }
    if (!parsed || parsed.t !== tenantId) {
      throw new AppError(MSG.OAUTH_STATE_INVALID, 400, ErrorCode.VALIDATION_ERROR);
    }

    const connector = await IntegrationsHubConnectorService.getConnectorEntity(tenantId, parsed.c);
    if (!connector.oauthTokenUrl || !connector.clientIdSettingKey) {
      throw new AppError(MSG.OAUTH_CONFIG_MISSING, 422, ErrorCode.VALIDATION_ERROR);
    }
    const clientId = await SettingService.getValue(tenantId, connector.clientIdSettingKey);
    const clientSecret = connector.clientSecretSettingKey
      ? await SettingService.getValue(tenantId, connector.clientSecretSettingKey)
      : null;
    if (!clientId) throw new AppError(MSG.OAUTH_CONFIG_MISSING, 422, ErrorCode.VALIDATION_ERROR);
    if (connector.clientSecretSettingKey && !clientSecret) {
      throw new AppError(MSG.OAUTH_CLIENT_SECRET_MISSING, 422, ErrorCode.VALIDATION_ERROR);
    }

    const token = await this.exchange(connector.oauthTokenUrl, {
      grant_type: 'authorization_code',
      code: data.code,
      redirect_uri: parsed.r,
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    });

    try {
      const ds = await tenantDataSourceFor(tenantId);
      const appRepo = ds.getRepository(ConnectedAppEntity);
      const tokenRepo = ds.getRepository(OAuthTokenEntity);

      const app = appRepo.create({
        tenantId,
        connectorKey: parsed.c,
        status: 'CONNECTED',
        connectedByUserId: parsed.u,
        lastSyncAt: new Date(),
      });
      const savedApp = await appRepo.save(app);

      await tokenRepo.save(tokenRepo.create({
        tenantId,
        connectedAppId: savedApp.connectedAppId,
        accessTokenEnc: encryptFieldOpt(token.access_token),
        refreshTokenEnc: token.refresh_token ? encryptFieldOpt(token.refresh_token) : undefined,
        scope: token.scope,
        tokenType: token.token_type,
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined,
      }));

      await WebhookService.dispatchEvent(tenantId, 'integration.connected', {
        connectorKey: parsed.c,
        connectedAppId: savedApp.connectedAppId,
        authType: 'OAUTH2',
      }).catch(() => {});

      return ConnectedAppSchema.parse(savedApp);
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${MSG.CONNECT_FAILED}: ${error}`);
      throw new AppError(MSG.CONNECT_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /** Return a valid access token for a connected app, refreshing if near expiry. */
  static async getAccessToken(tenantId: string, connectedAppId: string): Promise<string> {
    const ds = await tenantDataSourceFor(tenantId);
    const tokenRepo = ds.getRepository(OAuthTokenEntity);
    const row = await tokenRepo.findOne({ where: { tenantId, connectedAppId } });
    if (!row) throw new AppError(MSG.CONNECTED_APP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const expSoon = row.expiresAt && row.expiresAt.getTime() - Date.now() < REFRESH_SKEW_MS;
    if (expSoon) {
      await this.refreshTokenIfNeeded(tenantId, connectedAppId);
      const fresh = await tokenRepo.findOne({ where: { tenantId, connectedAppId } });
      if (fresh) return decryptFieldOpt(fresh.accessTokenEnc) as string;
    }
    return decryptFieldOpt(row.accessTokenEnc) as string;
  }

  /** Refresh the stored token using its refresh_token, if present. */
  static async refreshTokenIfNeeded(tenantId: string, connectedAppId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const tokenRepo = ds.getRepository(OAuthTokenEntity);
    const row = await tokenRepo.findOne({ where: { tenantId, connectedAppId } });
    if (!row) throw new AppError(MSG.CONNECTED_APP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (!row.refreshTokenEnc) throw new AppError(MSG.NO_REFRESH_TOKEN, 422, ErrorCode.VALIDATION_ERROR);

    const app = await ds.getRepository(ConnectedAppEntity).findOne({ where: { tenantId, connectedAppId } });
    if (!app) throw new AppError(MSG.CONNECTED_APP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const connector = await IntegrationsHubConnectorService.getConnectorEntity(tenantId, app.connectorKey);
    if (!connector.oauthTokenUrl || !connector.clientIdSettingKey) {
      throw new AppError(MSG.OAUTH_CONFIG_MISSING, 422, ErrorCode.VALIDATION_ERROR);
    }
    const clientId = await SettingService.getValue(tenantId, connector.clientIdSettingKey);
    const clientSecret = connector.clientSecretSettingKey
      ? await SettingService.getValue(tenantId, connector.clientSecretSettingKey)
      : null;
    if (!clientId) throw new AppError(MSG.OAUTH_CONFIG_MISSING, 422, ErrorCode.VALIDATION_ERROR);

    const refreshToken = decryptFieldOpt(row.refreshTokenEnc) as string;
    const token = await this.exchange(connector.oauthTokenUrl, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    }, MSG.TOKEN_REFRESH_FAILED);

    row.accessTokenEnc = encryptFieldOpt(token.access_token);
    if (token.refresh_token) row.refreshTokenEnc = encryptFieldOpt(token.refresh_token);
    if (token.scope) row.scope = token.scope;
    if (token.token_type) row.tokenType = token.token_type;
    row.expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined;
    await tokenRepo.save(row);
  }

  /** POST a form-encoded token request to the provider and parse the JSON. */
  private static async exchange(
    tokenUrl: string,
    params: Record<string, string>,
    failMessage: string = MSG.OAUTH_EXCHANGE_FAILED,
  ): Promise<TokenResponse> {
    let res: Response;
    try {
      res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams(params).toString(),
      });
    } catch (err) {
      Logger.error(`${failMessage}: ${err}`);
      throw new AppError(failMessage, 502, ErrorCode.INTERNAL_ERROR);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      Logger.error(`${failMessage}: ${res.status} ${detail.slice(0, 500)}`);
      throw new AppError(failMessage, 502, ErrorCode.INTERNAL_ERROR);
    }
    const json = (await res.json().catch(() => null)) as TokenResponse | null;
    if (!json || !json.access_token) {
      throw new AppError(failMessage, 502, ErrorCode.INTERNAL_ERROR);
    }
    return json;
  }
}
