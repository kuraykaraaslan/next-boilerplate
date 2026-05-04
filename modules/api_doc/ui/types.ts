export type ApiSpecStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED' | 'SUNSET';

export type SecuritySchemeType = 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS';

export interface SecurityScheme {
  type: SecuritySchemeType;
  name?: string;
  description?: string;
  in?: string;
  scheme?: string;
  flows?: Record<string, unknown>;
}

export interface Server {
  serverId: string;
  url: string;
  description?: string;
  environment?: 'production' | 'staging' | 'development' | 'sandbox';
}

export interface Tag {
  name: string;
  description?: string;
  externalDocs?: { url: string; description?: string };
}

export interface SchemaObject {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  enum?: unknown[];
  $ref?: string;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  deprecated?: boolean;
  description?: string;
  schema?: SchemaObject;
}

export interface MediaTypeObject {
  schema?: SchemaObject;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

export interface ResponseHeader {
  description?: string;
  schema?: SchemaObject;
}

export interface ApiResponse {
  statusCode: string;
  description?: string;
  content?: Record<string, MediaTypeObject>;
  headers?: Record<string, ResponseHeader>;
}

export interface CodeSample {
  lang: string;
  label?: string;
  source: string;
}

export interface Operation {
  operationId: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE';
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: ApiResponse[];
  security?: Record<string, string[]>[];
  deprecated?: boolean;
  codeSamples?: CodeSample[];
}

export interface PathItem {
  pathItemId: string;
  path: string;
  operations: Operation[];
}

export interface ApiSpec {
  openapi: string;
  status: ApiSpecStatus;
  info: {
    title: string;
    version: string;
    summary?: string;
    description?: string;
    contact?: { name?: string; email?: string; url?: string };
    license?: { name: string; url?: string };
    termsOfService?: string;
  };
  servers?: Server[];
  tags: Tag[];
  paths: PathItem[];
  components?: {
    securitySchemes?: Record<string, SecurityScheme>;
  };
}
