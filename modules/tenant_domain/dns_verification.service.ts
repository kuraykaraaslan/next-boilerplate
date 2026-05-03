import { env } from '@/libs/env';
import { Resolver } from 'dns/promises';
import crypto from 'crypto';
import redis from '@/libs/redis';
import type { VerificationMethod } from './tenant_domain.enums';

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
