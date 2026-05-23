import 'reflect-metadata';
import { env } from '@/modules/env';
import { Resolver } from 'dns/promises';
import crypto from 'crypto';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { tenantDataSourceFor, getDefaultTenantDataSource } from '@/modules/db';
import { TenantDomain as TenantDomainEntity } from './entities/tenant_domain.entity';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import type { VerificationMethod } from './tenant_domain.enums';

const DNS_RECHECK_CONCURRENCY = 5;

const DNS_VERIFICATION_PREFIX = 'dns_verify:';
const DNS_VERIFICATION_TTL = 60 * 60 * 24; // 24 saat
const TXT_RECORD_PREFIX = '_verification';
const CNAME_RECORD_PREFIX = '_verify';
const CNAME_TARGET_DOMAIN = env.VERIFICATION_DOMAIN || 'verify.example.com';

export default class DNSVerificationService {

  private static resolver = new Resolver();

  static generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // TXT Record
  static getTxtRecordName(domain: string): string {
    return `${TXT_RECORD_PREFIX}.${domain}`;
  }

  static getTxtRecordValue(token: string): string {
    return `verify=${token}`;
  }

  // CNAME Record
  static getCnameRecordName(domain: string, token: string): string {
    return `${CNAME_RECORD_PREFIX}-${token}.${domain}`;
  }

  static getCnameRecordTarget(): string {
    return CNAME_TARGET_DOMAIN;
  }

  // Redis operations
  static async storeVerificationData(
    tenantDomainId: string,
    token: string,
    method: VerificationMethod
  ): Promise<void> {
    const key = `${DNS_VERIFICATION_PREFIX}${tenantDomainId}`;
    const data = JSON.stringify({ token, method });
    await redis.set(key, data, 'EX', DNS_VERIFICATION_TTL);
  }

  static async getStoredData(tenantDomainId: string): Promise<{ token: string; method: VerificationMethod } | null> {
    const key = `${DNS_VERIFICATION_PREFIX}${tenantDomainId}`;
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  static async deleteStoredToken(tenantDomainId: string): Promise<void> {
    const key = `${DNS_VERIFICATION_PREFIX}${tenantDomainId}`;
    await redis.del(key);
  }

  // DNS Lookups
  static async lookupTxtRecords(domain: string): Promise<string[]> {
    try {
      const records = await this.resolver.resolveTxt(this.getTxtRecordName(domain));
      return records.flat();
    } catch {
      return [];
    }
  }

  static async lookupCnameRecord(recordName: string): Promise<string | null> {
    try {
      const records = await this.resolver.resolveCname(recordName);
      return records[0] || null;
    } catch {
      return null;
    }
  }

  // Verification methods
  static async verifyByTxt(domain: string, expectedToken: string): Promise<boolean> {
    const txtRecords = await this.lookupTxtRecords(domain);
    const expectedValue = this.getTxtRecordValue(expectedToken);
    return txtRecords.some(record => record === expectedValue);
  }

  static async verifyByCname(domain: string, token: string): Promise<boolean> {
    const recordName = this.getCnameRecordName(domain, token);
    const cnameTarget = await this.lookupCnameRecord(recordName);
    return cnameTarget === this.getCnameRecordTarget();
  }

  // Main verification flow
  static async initiateVerification(
    tenantDomainId: string,
    domain: string,
    method: VerificationMethod = 'TXT'
  ): Promise<{
    method: VerificationMethod;
    recordName: string;
    recordValue: string;
    token: string;
  }> {
    const token = this.generateToken();
    await this.storeVerificationData(tenantDomainId, token, method);

    if (method === 'CNAME') {
      return {
        method,
        recordName: this.getCnameRecordName(domain, token),
        recordValue: this.getCnameRecordTarget(),
        token
      };
    }

    return {
      method,
      recordName: this.getTxtRecordName(domain),
      recordValue: this.getTxtRecordValue(token),
      token
    };
  }

  /**
   * Health-check the DNS records of every ACTIVE TenantDomain. Domains whose
   * TXT/CNAME no longer resolves get downgraded to `DNS_FAILED` so admins are
   * forced to manually re-verify before traffic resumes. Runs in batches of
   * `DNS_RECHECK_CONCURRENCY` to avoid hammering the resolver on big tenants.
   */
  static async recheckActiveDomains(): Promise<{ checked: number; downgraded: number }> {
    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(TenantDomainEntity);
    const activeDomains = await repo.find({ where: { domainStatus: 'ACTIVE' } });

    let downgraded = 0;
    for (let i = 0; i < activeDomains.length; i += DNS_RECHECK_CONCURRENCY) {
      const batch = activeDomains.slice(i, i + DNS_RECHECK_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (d) => {
          try {
            const txt = await this.lookupTxtRecords(d.domain);
            if (txt.length > 0) return { domain: d, ok: true };
            const cnameProbe = await this.lookupCnameRecord(d.domain);
            return { domain: d, ok: cnameProbe !== null };
          } catch (err) {
            Logger.warn(`[DNSRecheck] Resolver error for ${d.domain}: ${err instanceof Error ? err.message : String(err)}`);
            return { domain: d, ok: false };
          }
        }),
      );

      for (const { domain: d, ok } of results) {
        if (ok) continue;
        try {
          const tenantDs = await tenantDataSourceFor(d.tenantId);
          await tenantDs.getRepository(TenantDomainEntity).update(
            { tenantDomainId: d.tenantDomainId },
            { domainStatus: 'DNS_FAILED', verifiedAt: undefined as unknown as Date },
          );
          await Promise.all([
            redis.del(`tenant:domain:name:${d.domain}`),
            redis.del(`tenant:domain:id:${d.tenantDomainId}`),
            redis.del(`tenant:domain:primary:${d.tenantId}`),
          ]);
          await AuditLogService.log({
            tenantId: d.tenantId,
            actorType: 'SYSTEM',
            action: 'domain.dns_check_failed',
            resourceType: 'tenant_domain',
            resourceId: d.tenantDomainId,
            metadata: { domain: d.domain },
          });
          downgraded += 1;
        } catch (err) {
          Logger.error(`[DNSRecheck] Failed to downgrade ${d.domain}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    Logger.info(`[DNSRecheck] checked=${activeDomains.length} downgraded=${downgraded}`);
    return { checked: activeDomains.length, downgraded };
  }

  static async checkVerification(tenantDomainId: string, domain: string): Promise<boolean> {
    const stored = await this.getStoredData(tenantDomainId);

    if (!stored) {
      return false;
    }

    const { token, method } = stored;

    const isVerified = method === 'CNAME'
      ? await this.verifyByCname(domain, token)
      : await this.verifyByTxt(domain, token);

    if (isVerified) {
      await this.deleteStoredToken(tenantDomainId);
    }

    return isVerified;
  }
}
