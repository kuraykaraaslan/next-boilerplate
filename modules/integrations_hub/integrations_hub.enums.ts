import { z } from 'zod';

export const ConnectorAuthTypeEnum = z.enum(['OAUTH2', 'API_KEY', 'WEBHOOK_ONLY']);
export type ConnectorAuthType = z.infer<typeof ConnectorAuthTypeEnum>;

export const ConnectedAppStatusEnum = z.enum(['CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING_AUTH']);
export type ConnectedAppStatus = z.infer<typeof ConnectedAppStatusEnum>;

export const IntegrationDirectionEnum = z.enum(['OUTBOUND', 'INBOUND']);
export type IntegrationDirection = z.infer<typeof IntegrationDirectionEnum>;

export const IntegrationEventStatusEnum = z.enum(['SUCCESS', 'FAILED']);
export type IntegrationEventStatus = z.infer<typeof IntegrationEventStatusEnum>;
