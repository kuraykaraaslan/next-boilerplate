import type { ApiSpec } from './types';

export const SYSTEM_SPEC: ApiSpec = {
  openapi: '3.1.0',
  status: 'ACTIVE',
  info: {
    title: 'System API',
    version: '1.0.0',
    summary: 'Internal system administration API',
    description: 'API for system-level administration: users, tenants, plans, audit logs, and settings.',
    contact: { name: 'Platform Team', email: 'platform@example.com' },
  },
  servers: [
    { serverId: 'prod', url: 'https://api.example.com', description: 'Production', environment: 'production' },
    { serverId: 'dev', url: 'http://localhost:3000', description: 'Local dev', environment: 'development' },
  ],
  tags: [
    { name: 'Users', description: 'System user management' },
    { name: 'Tenants', description: 'Tenant lifecycle management' },
    { name: 'Plans', description: 'Subscription plan management' },
    { name: 'Audit Logs', description: 'Immutable audit trail' },
  ],
  paths: [
    {
      pathItemId: 'users-list',
      path: '/system/api/users',
      operations: [
        {
          operationId: 'listUsers',
          method: 'GET',
          summary: 'List all system users',
          tags: ['Users'],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', format: 'int32' }, description: 'Page number (1-based)' },
            { name: 'limit', in: 'query', schema: { type: 'integer', format: 'int32' }, description: 'Results per page' },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Filter by name or email' },
          ],
          security: [{ bearerAuth: [] }],
          responses: [
            {
              statusCode: '200',
              description: 'Paginated user list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: { type: 'array', items: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' }, email: { type: 'string', format: 'email' }, name: { type: 'string' }, role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'USER'] } }, required: ['userId', 'email'] } },
                      total: { type: 'integer' },
                      page: { type: 'integer' },
                    },
                  },
                },
              },
            },
            { statusCode: '401', description: 'Unauthorized' },
          ],
        },
      ],
    },
    {
      pathItemId: 'tenants-crud',
      path: '/system/api/tenants',
      operations: [
        {
          operationId: 'listTenants',
          method: 'GET',
          summary: 'List tenants',
          tags: ['Tenants'],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'TRIAL'] }, description: 'Filter by status' },
          ],
          security: [{ bearerAuth: [] }],
          responses: [
            { statusCode: '200', description: 'Tenant list', content: { 'application/json': { schema: { type: 'object', properties: { tenants: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } } } } },
            { statusCode: '401', description: 'Unauthorized' },
          ],
        },
        {
          operationId: 'createTenant',
          method: 'POST',
          summary: 'Create a new tenant',
          tags: ['Tenants'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'slug'],
                  properties: {
                    name: { type: 'string', description: 'Display name' },
                    slug: { type: 'string', description: 'URL-safe identifier' },
                    planId: { type: 'string', format: 'uuid', description: 'Initial subscription plan' },
                  },
                },
              },
            },
          },
          responses: [
            { statusCode: '201', description: 'Tenant created' },
            { statusCode: '400', description: 'Validation error' },
            { statusCode: '409', description: 'Slug already in use' },
          ],
        },
      ],
    },
    {
      pathItemId: 'plans-list',
      path: '/system/api/subscriptions/plans',
      operations: [
        {
          operationId: 'listPlans',
          method: 'GET',
          summary: 'List subscription plans',
          tags: ['Plans'],
          security: [{ bearerAuth: [] }],
          responses: [
            { statusCode: '200', description: 'Plan list' },
          ],
        },
        {
          operationId: 'createPlan',
          method: 'POST',
          summary: 'Create subscription plan',
          tags: ['Plans'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'monthlyPrice'],
                  properties: {
                    name: { type: 'string' },
                    monthlyPrice: { type: 'number' },
                    yearlyPrice: { type: 'number' },
                    currency: { type: 'string', default: 'USD' },
                    trialDays: { type: 'integer', default: 0 },
                  },
                },
              },
            },
          },
          responses: [
            { statusCode: '201', description: 'Plan created' },
            { statusCode: '400', description: 'Validation error' },
          ],
        },
      ],
    },
    {
      pathItemId: 'audit-logs',
      path: '/system/api/audit-logs',
      operations: [
        {
          operationId: 'listAuditLogs',
          method: 'GET',
          summary: 'Query audit log entries',
          tags: ['Audit Logs'],
          parameters: [
            { name: 'actorId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by actor' },
            { name: 'action', in: 'query', schema: { type: 'string' }, description: 'Filter by action type' },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          ],
          security: [{ bearerAuth: [] }],
          responses: [
            { statusCode: '200', description: 'Audit log entries' },
            { statusCode: '401', description: 'Unauthorized' },
          ],
        },
      ],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'JWT Bearer token from session' },
    },
  },
};

export const TENANT_SPEC: ApiSpec = {
  openapi: '3.1.0',
  status: 'ACTIVE',
  info: {
    title: 'Tenant API',
    version: '1.0.0',
    summary: 'Per-tenant management API',
    description: 'API for managing tenant resources: members, settings, domains, invitations, and subscriptions.',
    contact: { name: 'Support', email: 'support@example.com' },
  },
  servers: [
    { serverId: 'prod', url: 'https://api.example.com', description: 'Production', environment: 'production' },
    { serverId: 'dev', url: 'http://localhost:3000', description: 'Local dev', environment: 'development' },
  ],
  tags: [
    { name: 'Members', description: 'Tenant membership management' },
    { name: 'Invitations', description: 'Invite new members' },
    { name: 'Settings', description: 'Tenant configuration' },
    { name: 'Domains', description: 'Custom domain management' },
  ],
  paths: [
    {
      pathItemId: 'members',
      path: '/tenant/{tenantId}/api/members',
      operations: [
        {
          operationId: 'listMembers',
          method: 'GET',
          summary: 'List tenant members',
          tags: ['Members'],
          parameters: [
            { name: 'tenantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'role', in: 'query', schema: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] } },
          ],
          security: [{ bearerAuth: [] }],
          responses: [
            { statusCode: '200', description: 'Member list', content: { 'application/json': { schema: { type: 'object', properties: { members: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } } } } },
            { statusCode: '403', description: 'Forbidden' },
          ],
        },
      ],
    },
    {
      pathItemId: 'invitations',
      path: '/tenant/{tenantId}/api/invitations',
      operations: [
        {
          operationId: 'listInvitations',
          method: 'GET',
          summary: 'List pending invitations',
          tags: ['Invitations'],
          parameters: [
            { name: 'tenantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          security: [{ bearerAuth: [] }],
          responses: [{ statusCode: '200', description: 'Invitation list' }],
        },
        {
          operationId: 'createInvitation',
          method: 'POST',
          summary: 'Invite a new member',
          tags: ['Invitations'],
          parameters: [
            { name: 'tenantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' },
                  },
                },
              },
            },
          },
          responses: [
            { statusCode: '201', description: 'Invitation sent' },
            { statusCode: '409', description: 'Already a member or invitation exists' },
          ],
        },
      ],
    },
    {
      pathItemId: 'settings',
      path: '/tenant/{tenantId}/api/settings',
      operations: [
        {
          operationId: 'getSettings',
          method: 'GET',
          summary: 'Get tenant settings',
          tags: ['Settings'],
          parameters: [
            { name: 'tenantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          security: [{ bearerAuth: [] }],
          responses: [{ statusCode: '200', description: 'Tenant settings object' }],
        },
        {
          operationId: 'updateSettings',
          method: 'PATCH',
          summary: 'Update tenant settings',
          tags: ['Settings'],
          parameters: [
            { name: 'tenantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    logoUrl: { type: 'string', format: 'uri' },
                    primaryColor: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
                  },
                },
              },
            },
          },
          responses: [
            { statusCode: '200', description: 'Settings updated' },
            { statusCode: '400', description: 'Validation error' },
          ],
        },
      ],
    },
    {
      pathItemId: 'domains',
      path: '/tenant/{tenantId}/api/domains',
      operations: [
        {
          operationId: 'listDomains',
          method: 'GET',
          summary: 'List custom domains',
          tags: ['Domains'],
          parameters: [
            { name: 'tenantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          security: [{ bearerAuth: [] }],
          responses: [{ statusCode: '200', description: 'Domain list' }],
        },
        {
          operationId: 'addDomain',
          method: 'POST',
          summary: 'Add a custom domain',
          tags: ['Domains'],
          parameters: [
            { name: 'tenantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['domain'],
                  properties: { domain: { type: 'string', description: 'e.g. app.example.com' } },
                },
              },
            },
          },
          responses: [
            { statusCode: '201', description: 'Domain added — awaiting DNS verification' },
            { statusCode: '409', description: 'Domain already registered' },
          ],
        },
      ],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'JWT Bearer token from session' },
    },
  },
};
