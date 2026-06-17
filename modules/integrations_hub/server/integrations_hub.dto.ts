import { z } from 'zod';
import { ConnectorAuthTypeEnum, ConnectedAppStatusEnum } from './integrations_hub.enums';
import { ApiKeyScopeEnum } from '@kuraykaraaslan/api_key/server/api_key.enums';

const ConnectorKey = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Invalid connector key');

export const UpsertConnectorRequestSchema = z.object({
  key: ConnectorKey,
  name: z.string().min(1).max(120),
  category: z.string().max(64).default('other'),
  authType: ConnectorAuthTypeEnum,
  iconUrl: z.string().url().optional(),
  isEnabled: z.boolean().default(true),
  triggers: z.array(z.object({ key: z.string(), label: z.string(), event: z.string() })).max(100).optional(),
  actions: z.array(z.object({ key: z.string(), label: z.string() })).max(100).optional(),
  oauthAuthUrl: z.string().url().optional(),
  oauthTokenUrl: z.string().url().optional(),
  oauthScopes: z.array(z.string()).max(100).optional(),
  clientIdSettingKey: z.string().max(128).optional(),
  clientSecretSettingKey: z.string().max(128).optional(),
});
export type UpsertConnectorDTO = z.infer<typeof UpsertConnectorRequestSchema>;

export const ConnectApiKeyRequestSchema = z.object({
  connectorKey: ConnectorKey,
  externalAccountId: z.string().max(256).optional(),
  externalAccountName: z.string().max(256).optional(),
  scopes: z.array(ApiKeyScopeEnum).min(1).default(['read', 'write']),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type ConnectApiKeyDTO = z.infer<typeof ConnectApiKeyRequestSchema>;

export const BeginOAuthRequestSchema = z.object({
  connectorKey: ConnectorKey,
  redirectUri: z.string().url(),
});
export type BeginOAuthDTO = z.infer<typeof BeginOAuthRequestSchema>;

export const OAuthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
export type OAuthCallbackDTO = z.infer<typeof OAuthCallbackQuerySchema>;

export const FireTriggerRequestSchema = z.object({
  connectorKey: ConnectorKey,
  eventKey: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type FireTriggerDTO = z.infer<typeof FireTriggerRequestSchema>;

export const ListConnectedAppsQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  connectorKey: z.string().optional(),
  status: ConnectedAppStatusEnum.optional(),
});
export type ListConnectedAppsQuery = z.infer<typeof ListConnectedAppsQuerySchema>;
