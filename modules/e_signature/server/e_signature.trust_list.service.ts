import 'reflect-metadata';
import { promises as fs } from 'node:fs';
import { getDataSource } from '@nb/db';
import redis from '@nb/redis';
import { env } from '@nb/env';
import Logger from '@nb/logger';
import { TrustListEntry } from './entities/trust_list_entry.entity';
import ESignatureCryptoService from './e_signature.crypto.service';
import ESignatureETSI_TSLService from './e_signature.etsi_tsl.service';
import {
  DEFAULT_EU_LOTL_URL,
  TRUST_LIST_CACHE_TTL_SECONDS,
} from './e_signature.constants';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import type { CountryCode } from './e_signature.types';

const REDIS_KEY = (country: CountryCode) => `e_signature:trust_list:${country}`;

/**
 * Trust list management for e_signature.
 *
 * Sources:
 *   - **ETSI EU LOTL** (List of Trusted Lists, XML) — gives a list of
 *     country TSLs whose issuer certs we ingest into TrustListEntry rows.
 *   - **TR KamuSM** — packaged PEM bundle on disk (TR_TRUST_ROOTS_PATH).
 *   - **manual** — operator-inserted roots.
 *
 * Daily ingestion should be triggered by a cron caller (out of scope here).
 */
export default class ESignatureTrustListService {
  // ── Read path ─────────────────────────────────────────────────────────────
  static async getTrustRootsForCountry(country: CountryCode): Promise<string[]> {
    const cached = await redis.get(REDIS_KEY(country)).catch(() => null);
    if (cached) {
      try { return JSON.parse(cached) as string[]; } catch { /* fall through */ }
    }
    const ds = await getDataSource();
    const rows = await ds.getRepository(TrustListEntry).find({
      where: { country },
    });
    const pems = rows
      .filter((r) => r.notAfter > new Date())
      .map((r) => r.certificatePem);
    await redis
      .setex(REDIS_KEY(country), TRUST_LIST_CACHE_TTL_SECONDS, JSON.stringify(pems))
      .catch(() => {});
    return pems;
  }

  static async clearCache(country?: CountryCode): Promise<void> {
    if (country) {
      await redis.del(REDIS_KEY(country)).catch(() => {});
    } else {
      // Best-effort wildcard clear via SCAN
      try {
        const stream = redis.scanStream({ match: 'e_signature:trust_list:*' });
        const keys: string[] = [];
        for await (const batch of stream as AsyncIterable<string[]>) keys.push(...batch);
        if (keys.length) await redis.del(...keys);
      } catch (err) {
        Logger.warn(`trust list cache clear failed: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // ── Ingestion ─────────────────────────────────────────────────────────────
  static async ingestAll(): Promise<{ etsi: number; tr: number }> {
    const [etsi, tr] = await Promise.all([
      ESignatureTrustListService.ingestEtsiLOTL().catch((err) => {
        Logger.warn(`ETSI LOTL ingest failed: ${err instanceof Error ? err.message : err}`);
        return 0;
      }),
      ESignatureTrustListService.ingestTrKamuSm().catch((err) => {
        Logger.warn(`TR KamuSM ingest failed: ${err instanceof Error ? err.message : err}`);
        return 0;
      }),
    ]);
    await ESignatureTrustListService.clearCache();
    return { etsi, tr };
  }

  /**
   * Fetch + parse the ETSI EU LOTL, walk each country's TSL, extract trust
   * anchor certs, persist them as `TrustListEntry` rows (source = etsi_lotl).
   *
   * XAdES verification of the LOTL itself is performed when
   * `LOTL_SIGNER_CERT_PEM` is provided (the publicly-listed LOTL distribution
   * point cert, distributed out-of-band). Per-country TSLs are XAdES-verified
   * against the signing certs declared in the LOTL TSLPointer.
   */
  static async ingestEtsiLOTL(): Promise<number> {
    const url = env.EU_LOTL_URL || DEFAULT_EU_LOTL_URL;
    let lotlXml: string;
    try {
      lotlXml = await ESignatureETSI_TSLService.fetchLotl(url);
    } catch {
      throw new AppError(E_SIGNATURE_MESSAGES.TRUST_LIST_FETCH_FAILED, 503, ErrorCode.INTERNAL_ERROR);
    }

    const trustedLotlSignerPem = env.LOTL_SIGNER_CERT_PEM;
    const { pointers, signatureVerified } = ESignatureETSI_TSLService.parseLotl(lotlXml, {
      trustedLotlSignerPem,
    });
    if (trustedLotlSignerPem && !signatureVerified) {
      Logger.warn('LOTL signature verification failed — skipping ingestion');
      return 0;
    }
    if (!trustedLotlSignerPem) {
      Logger.warn('LOTL_SIGNER_CERT_PEM not configured — LOTL ingested unverified');
    }
    Logger.info(`ETSI LOTL: discovered ${pointers.length} country pointers`);

    let totalInserted = 0;
    for (const pointer of pointers) {
      try {
        const tslXml = await ESignatureETSI_TSLService.fetchTsl(pointer.tslUrl);
        const { entries, signatureVerified: tslOk } = ESignatureETSI_TSLService.parseTsl(
          tslXml,
          pointer.country,
          { signingCertsBase64: pointer.signingCertsBase64 },
        );
        if (pointer.signingCertsBase64.length > 0 && !tslOk) {
          Logger.warn(`TSL ${pointer.country} signature invalid — skipping`);
          continue;
        }
        if (entries.length === 0) continue;
        const inserted = await ESignatureTrustListService.persistRoots({
          country: pointer.country,
          pemBlocks: entries.map((e) => e.certificatePem),
          source: 'etsi_lotl',
        });
        totalInserted += inserted;
      } catch (err) {
        Logger.warn(`TSL ${pointer.country} ingest failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    return totalInserted;
  }

  static async ingestTrKamuSm(): Promise<number> {
    const path = env.TR_TRUST_ROOTS_PATH;
    if (!path) {
      Logger.info('TR_TRUST_ROOTS_PATH not configured; skipping TR root ingestion');
      return 0;
    }
    try {
      const bundle = await fs.readFile(path, 'utf8');
      const blocks = bundle.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
      if (!blocks.length) return 0;
      return ESignatureTrustListService.persistRoots({
        country: 'TR',
        pemBlocks: blocks,
        source: 'tr_kamusm',
      });
    } catch {
      throw new AppError(E_SIGNATURE_MESSAGES.TRUST_LIST_FETCH_FAILED, 503, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async persistRoots({
    country,
    pemBlocks,
    source,
  }: {
    country: CountryCode;
    pemBlocks: string[];
    source: 'etsi_lotl' | 'tr_kamusm' | 'manual';
  }): Promise<number> {
    const ds = await getDataSource();
    const repo = ds.getRepository(TrustListEntry);
    let inserted = 0;
    for (const pem of pemBlocks) {
      try {
        const claims = ESignatureCryptoService.parseCertificate(Buffer.from(pem, 'utf8'));
        const ski = ESignatureCryptoService.subjectKeyIdentifierHex(Buffer.from(pem, 'utf8'));
        const existing = ski
          ? await repo.findOne({ where: { country, subjectKeyIdentifier: ski } })
          : await repo.findOne({ where: { country, issuerDN: claims.issuerDN } });
        if (existing) {
          await repo.update({ trustListEntryId: existing.trustListEntryId }, {
            certificatePem: pem,
            notBefore: new Date(claims.notBefore),
            notAfter: new Date(claims.notAfter),
            source,
          });
        } else {
          await repo.save(repo.create({
            country,
            issuerDN: claims.issuerDN,
            certificatePem: pem,
            subjectKeyIdentifier: ski,
            notBefore: new Date(claims.notBefore),
            notAfter: new Date(claims.notAfter),
            source,
          }));
          inserted++;
        }
      } catch (err) {
        Logger.warn(`failed to persist trust root: ${err instanceof Error ? err.message : err}`);
      }
    }
    return inserted;
  }
}
