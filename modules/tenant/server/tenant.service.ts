import 'reflect-metadata';
import { SafeTenant } from './tenant.types';
import { CreateTenantInput, UpdateTenantInput, GetTenantsInput } from './tenant.dto';
import { getAll, getById, getBySlug } from './tenant.read.service';
import { create, update, provisionPersonal, remove, verifyIsolation } from './tenant.write.service';

/**
 * Tenant service facade. The implementation is split across focused modules
 * (`tenant.read.service` queries + caching, `tenant.write.service`
 * create/update/provision/delete + isolation audit, `tenant.helpers` cache +
 * default seeding); this class preserves the single `TenantService.*` entry
 * point its callers depend on.
 */
export default class TenantService {
  static getAll(input: GetTenantsInput): Promise<{ tenants: SafeTenant[]; total: number }> {
    return getAll(input);
  }

  static getById(tenantId: string): Promise<SafeTenant> {
    return getById(tenantId);
  }

  static getBySlug(slug: string): Promise<SafeTenant> {
    return getBySlug(slug);
  }

  static create(data: CreateTenantInput): Promise<SafeTenant> {
    return create(data);
  }

  static update(tenantId: string, data: UpdateTenantInput): Promise<SafeTenant> {
    return update(tenantId, data);
  }

  static provisionPersonal(userId: string, email: string): Promise<SafeTenant> {
    return provisionPersonal(userId, email);
  }

  static delete(tenantId: string): Promise<void> {
    return remove(tenantId);
  }

  static verifyIsolation(tenantId: string, tableName: string): Promise<{ ok: boolean; leakedRows: number }> {
    return verifyIsolation(tenantId, tableName);
  }
}
