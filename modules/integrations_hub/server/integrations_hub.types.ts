import { z } from 'zod';
import {
  ConnectorAuthTypeEnum,
  ConnectedAppStatusEnum,
  IntegrationDirectionEnum,
  IntegrationEventStatusEnum,
} from './integrations_hub.enums';

export const ConnectorTriggerSchema = z.object({
  key: z.string(),
  label: z.string(),
  event: z.string(),
});

export const ConnectorActionSchema = z.object({
  key: z.string(),
  label: z.string(),
});

/** Safe connector shape — never exposes client secrets (only the setting key). */
export const ConnectorSchema = z.object({
  connectorId: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  category: z.string(),
  authType: ConnectorAuthTypeEnum,
  iconUrl: z.string().nullable().optional(),
  isEnabled: z.boolean(),
  triggers: z.array(ConnectorTriggerSchema).nullable().optional(),
  actions: z.array(ConnectorActionSchema).nullable().optional(),
  oauthAuthUrl: z.string().nullable().optional(),
  oauthTokenUrl: z.string().nullable().optional(),
  oauthScopes: z.array(z.string()).nullable().optional(),
  clientIdSettingKey: z.string().nullable().optional(),
  clientSecretSettingKey: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Connector = z.infer<typeof ConnectorSchema>;

export const ConnectedAppSchema = z.object({
  connectedAppId: z.string().uuid(),
  connectorKey: z.string(),
  status: ConnectedAppStatusEnum,
  connectedByUserId: z.string().uuid(),
  externalAccountId: z.string().nullable().optional(),
  externalAccountName: z.string().nullable().optional(),
  webhookId: z.string().nullable().optional(),
  apiKeyId: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
  lastSyncAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ConnectedApp = z.infer<typeof ConnectedAppSchema>;

export const IntegrationEventSchema = z.object({
  integrationEventId: z.string().uuid(),
  connectedAppId: z.string().uuid(),
  direction: IntegrationDirectionEnum,
  eventKey: z.string(),
  status: IntegrationEventStatusEnum,
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
  createdAt: z.date(),
});
export type IntegrationEvent = z.infer<typeof IntegrationEventSchema>;
