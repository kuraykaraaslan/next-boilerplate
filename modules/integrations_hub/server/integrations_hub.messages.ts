export const INTEGRATIONS_HUB_MESSAGES = {
  // Connectors
  CONNECTOR_NOT_FOUND: 'Connector not found',
  CONNECTOR_DISABLED: 'This connector is disabled',
  CONNECTOR_SAVE_FAILED: 'Failed to save connector',
  CONNECTOR_FETCH_FAILED: 'Failed to fetch connectors',

  // Connected apps
  CONNECTED_APP_NOT_FOUND: 'Connected app not found',
  ALREADY_CONNECTED: 'This connector is already connected for that account',
  CONNECT_FAILED: 'Failed to connect integration',
  DISCONNECT_FAILED: 'Failed to disconnect integration',

  // OAuth
  OAUTH_NOT_SUPPORTED: 'This connector does not support OAuth',
  OAUTH_CONFIG_MISSING: 'OAuth configuration is incomplete for this connector',
  OAUTH_STATE_INVALID: 'The OAuth state is invalid or expired',
  OAUTH_EXCHANGE_FAILED: 'Failed to exchange the OAuth authorization code',
  OAUTH_CLIENT_SECRET_MISSING: 'OAuth client secret is not configured',
  TOKEN_REFRESH_FAILED: 'Failed to refresh the OAuth token',
  NO_REFRESH_TOKEN: 'No refresh token available for this connection',

  // API-key connectors
  API_KEY_NOT_SUPPORTED: 'This connector does not use API-key auth',

  // Triggers / actions
  TRIGGER_FAILED: 'Failed to fire integration trigger',
  ACTION_NOT_FOUND: 'Unknown integration action',
  ACTION_FAILED: 'Failed to handle integration action',
  NO_WEBHOOK_BOUND: 'This connection has no outbound webhook configured',
} as const;
