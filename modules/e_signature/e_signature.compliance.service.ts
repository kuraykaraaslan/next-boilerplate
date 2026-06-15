import 'reflect-metadata'
import { SignedXml } from 'xml-crypto'
import redis from '@/modules/redis'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import SettingService from '@/modules/setting/setting.service'
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants'
import ESignatureCryptoService from './e_signature.crypto.service'

export type LoA = 'low' | 'substantial' | 'high'
export type EnforcementMode = 'NONE' | 'AES' | 'QES'

const LOA_RANK: Record<LoA, number> = { low: 1, substantial: 2, high: 3 }

export interface ESignaturePolicy {
  /** Minimum signature level required (NONE/AES/QES). */
  enforcementMode: EnforcementMode
  /** Capture ESIGN Act / UETA intent + consent (US). */
  esignActMode: boolean
  /** Per-country minimum identity assurance (LoA). */
  countryMinLoa: Record<string, LoA>
  /** Global minimum LoA (eidRequiredLoA), default 'substantial'. */
  requiredLoa: LoA
  archivalEnabled: boolean
  archivalRetentionDays: number
  rateLimitPerHour: number
}

/**
 * E-signature compliance layer: per-tenant signature policy + enforcement
 * (eIDAS AES/QES level, ESIGN/UETA, per-country LoA), third-party signature
 * verification, certificate-expiry alerting, anti-abuse rate limiting, and
 * signed-document long-term archival. No mock — verification uses real XML-DSig
 * + X.509 validation; archival uses real object storage.
 */
export default class ESignatureComplianceService {

  static async getPolicy(tenantId?: string): Promise<ESignaturePolicy> {
    const read = async (k: string) => {
      try { return await SettingService.getValue(tenantId ?? ROOT_TENANT_ID, k) } catch { return null }
    }
    const [mode, esignAct, countryMap, requiredLoa, archEnabled, retention, rate] = await Promise.all([
      read('esigEnforcementMode'), read('esigEsignActMode'), read('esigCountryMinLoa'),
      read('eidRequiredLoA'), read('esigArchivalEnabled'), read('esigArchivalRetentionDays'), read('esigRateLimitPerHour'),
    ])
    let countryMinLoa: Record<string, LoA> = {}
    if (countryMap) { try { countryMinLoa = JSON.parse(countryMap) } catch { countryMinLoa = {} } }
    const validMode = (m: string | null): EnforcementMode => (m === 'AES' || m === 'QES' ? m : 'NONE')
    const validLoa = (l: string | null, d: LoA): LoA => (l === 'low' || l === 'substantial' || l === 'high' ? l : d)
    return {
      enforcementMode: validMode(mode),
      esignActMode: esignAct === 'true',
      countryMinLoa,
      requiredLoa: validLoa(requiredLoa, 'substantial'),
      archivalEnabled: archEnabled !== 'false',
      archivalRetentionDays: Number(retention) > 0 ? Number(retention) : 3650,
      rateLimitPerHour: Number(rate) > 0 ? Number(rate) : 20,
    }
  }

  /** Assert a signing event meets the required identity assurance for a country. */
  static async assertAssurance(providedLoa: LoA, country: string | null, tenantId?: string): Promise<void> {
    const policy = await this.getPolicy(tenantId)
    const required = (country && policy.countryMinLoa[country.toUpperCase()]) || policy.requiredLoa
    if (LOA_RANK[providedLoa] < LOA_RANK[required]) {
      throw new AppError(`Identity assurance ${providedLoa} is below the required ${required} for ${country ?? 'this jurisdiction'}`, 403, ErrorCode.FORBIDDEN)
    }
  }

  /** Whether a given enforcement level is satisfied by the achieved one. */
  static satisfiesEnforcement(required: EnforcementMode, achieved: EnforcementMode): boolean {
    const rank: Record<EnforcementMode, number> = { NONE: 0, AES: 1, QES: 2 }
    return rank[achieved] >= rank[required]
  }

  // ── Anti-abuse rate limiting ────────────────────────────────────────────────

  /** Per-identifier signing/identity rate limit (e.g. per national-id hash). */
  static async assertNotRateLimited(identifier: string, tenantId?: string): Promise<void> {
    const policy = await this.getPolicy(tenantId)
    const key = `esig:rate:${tenantId ?? 'sys'}:${identifier}`
    try {
      const n = await redis.incr(key)
      if (n === 1) await redis.expire(key, 3600)
      if (n > policy.rateLimitPerHour) {
        throw new AppError('Too many signature attempts for this identifier; please retry later', 429, ErrorCode.RATE_LIMIT_EXCEEDED)
      }
    } catch (e) {
      if (e instanceof AppError) throw e // honour a tripped limit
    }
  }

  // ── Third-party signature verification ──────────────────────────────────────

  /**
   * Verify a signed XML document for a third-party audit: validates the
   * enveloped XML-DSig cryptographically (xml-crypto, cert read from KeyInfo)
   * and checks the embedded X.509 certificate's validity window. Optionally
   * validates the trust chain when trust roots are supplied.
   */
  static async verifySignedXml(xml: string, opts?: { trustRootsPem?: string[]; at?: Date }): Promise<{
    signatureValid: boolean
    certValid: boolean
    chainValid: boolean | null
    reasons: string[]
    signedAt: Date
  }> {
    const reasons: string[] = []
    const at = opts?.at ?? new Date()
    const sigMatch = xml.match(/<([a-zA-Z0-9]+:)?Signature[\s\S]*?<\/([a-zA-Z0-9]+:)?Signature>/)
    if (!sigMatch) return { signatureValid: false, certValid: false, chainValid: null, reasons: ['no_signature'], signedAt: at }

    let signatureValid = false
    try {
      const sig = new SignedXml()
      sig.getCertFromKeyInfo = SignedXml.getCertFromKeyInfo
      sig.loadSignature(sigMatch[0])
      signatureValid = sig.checkSignature(xml)
      if (!signatureValid) reasons.push('signature_invalid')
    } catch (e) {
      reasons.push('signature_error')
      Logger.warn(`[e_signature] verify failed: ${e instanceof Error ? e.message : e}`)
    }

    // Validate the embedded certificate (validity window + optional chain).
    let certValid = false
    let chainValid: boolean | null = null
    const certMatch = xml.match(/<([a-zA-Z0-9]+:)?X509Certificate>([\s\S]*?)<\/([a-zA-Z0-9]+:)?X509Certificate>/)
    if (certMatch) {
      try {
        const der = Buffer.from(certMatch[2].replace(/\s+/g, ''), 'base64')
        ESignatureCryptoService.assertValidityWindow(der, at)
        certValid = true
        if (opts?.trustRootsPem && opts.trustRootsPem.length > 0) {
          const res = await ESignatureCryptoService.validateChain({ leaf: der, intermediates: [], trustRootsPem: opts.trustRootsPem, at }).catch(() => null)
          chainValid = res ? (res as { ok?: boolean }).ok ?? Boolean(res) : false
          if (!chainValid) reasons.push('chain_invalid')
        }
      } catch {
        reasons.push('cert_expired_or_invalid')
      }
    } else {
      reasons.push('no_certificate')
    }
    return { signatureValid, certValid, chainValid, reasons, signedAt: at }
  }

  // Certificate-expiry alerting and active-cert listing operate on the
  // certificate↔user binding table, which is an auth concern. They live in the
  // consumer module now: see AuthESignatureCertAlertsService in
  // modules/auth_e_signature/auth_e_signature.cert_alerts.ts.

  // ── Long-term archival ──────────────────────────────────────────────────────

  /**
   * Archive a signed document to the tenant's object storage with retention
   * metadata, returning the storage key + a verification checksum. Long-term
   * archival is required for evidentiary value (eIDAS Art. 34 preservation).
   */
  static async archiveSignedDocument(
    tenantId: string,
    doc: { bytes: Buffer; filename: string; contentType?: string; transactionId?: string },
  ): Promise<{ key: string; sha256: string; retentionUntil: string } | null> {
    const policy = await this.getPolicy(tenantId)
    if (!policy.archivalEnabled) return null
    const { createHash } = await import('node:crypto')
    const sha256 = createHash('sha256').update(doc.bytes).digest('hex')
    const { default: StorageService } = await import('@/modules/storage/storage.service')
    const uploaded = await StorageService.uploadServerBuffer(tenantId, {
      buffer: doc.bytes, filename: doc.filename,
      contentType: doc.contentType ?? 'application/octet-stream', folder: 'esignature-archive',
    })
    const retentionUntil = new Date(Date.now() + policy.archivalRetentionDays * 86_400_000).toISOString()
    Logger.info(`[e_signature] archived ${doc.filename} (txn ${doc.transactionId ?? '-'}) key=${uploaded.key} retain=${retentionUntil}`)
    return { key: uploaded.key, sha256, retentionUntil }
  }
}
