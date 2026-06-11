import { describe, it, expect } from 'vitest';
import { buildAuthDtoSchemas, buildAuthOpenApiDocument } from '../auth.openapi';

describe('auth OpenAPI export (GTH-16)', () => {
  it('emits a JSON schema for every auth DTO', () => {
    const schemas = buildAuthDtoSchemas();
    expect(Object.keys(schemas)).toEqual(
      expect.arrayContaining(['LoginDTO', 'RegisterDTO', 'ResetPasswordDTO', 'VerifyOTPDTO']),
    );
  });

  it('marks email fields with format=email and required keys', () => {
    const { LoginDTO } = buildAuthDtoSchemas() as Record<string, any>;
    expect(LoginDTO.type).toBe('object');
    expect(LoginDTO.properties.email.format).toBe('email');
    expect(LoginDTO.required).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('keeps optional fields out of required', () => {
    const { RegisterDTO } = buildAuthDtoSchemas() as Record<string, any>;
    expect(RegisterDTO.required).not.toContain('phone');
    expect(RegisterDTO.required).not.toContain('consentVersion');
  });

  it('wraps the schemas in a valid OpenAPI 3.1 document', () => {
    const doc = buildAuthOpenApiDocument() as any;
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.components.schemas.LoginDTO).toBeDefined();
  });
});
