import tls from 'node:tls';
import { getDefaultTenantDataSource } from '@/modules/db';
import { TenantDomain } from './entities/tenant_domain.entity';
import type { SslStatus } from './tenant_domain.enums';
import Logger from '@/modules/logger';

/**
 * SSL / TLS observability for tenant custom domains.
 *
 * The platform does NOT obtain certificates itself. Instead, a reverse proxy
 * (Caddy, Traefik, cert-manager, etc.) terminates TLS and issues certs via
 * Let's Encrypt or any ACME-compatible CA. This service:
 *
 *   1. Tells the reverse proxy whether a given hostname is allowed to
 *      provision a cert (see `isProvisioningAllowed` — Caddy's
 *      `on_demand_tls.ask` hits the `/internal/api/caddy-ask` route which
 *      delegates here).
 *
 *   2. Periodically opens a TLS handshake against every ACTIVE domain,
 *      parses the leaf cert, and writes `sslStatus / sslIssuedAt /
 *      sslExpiresAt / sslIssuer / sslLastCheckedAt` back to the
 *      `TenantDomain` row — see `recheckCertificates()`, wired into the
 *      `tenant-domain-ssl-check` daily cron.
 *
 * Reference Caddy config snippet (full example in
 * [docs/caddy-on-demand-tls.md](../../docs/caddy-on-demand-tls.md)):
 *
 *     {
 *       on_demand_tls {
 *         ask http://app:3000/internal/api/caddy-ask
 *       }
 *     }
 */

const HANDSHAKE_TIMEOUT_MS = 7_000;
const EXPIRING_WINDOW_DAYS = 30;
const RECHECK_CONCURRENCY = 5;

/** A simplified cert summary returned from a successful TLS probe. */
export interface CertProbeResult {
  ok: true;
  issuer: string;
  validFrom: Date;
  validTo: Date;
}

export interface CertProbeFailure {
  ok: false;
  reason: string;
}

export default class SSLProvisioningService {
  /**
   * Caddy `on_demand_tls.ask` callback target. Returns true (= HTTP 200) iff
   * the hostname is a verified custom domain bound to an ACTIVE tenant.
   * Refusing everything else keeps Let's Encrypt rate-limits safe — a random
   * stranger pointing their DNS at us cannot trigger unbounded cert
   * issuance.
   *
   * Side effect: a successful authorization flips `sslStatus` from
   * `DISABLED` → `PENDING` so the UI can show the admin that provisioning
   * is in flight. The next handshake (cron or manual) promotes it to
   * `ACTIVE`.
   */
  static async isProvisioningAllowed(domain: string): Promise<boolean> {
    if (!domain || typeof domain !== 'string') return false;
    const host = domain.trim().toLowerCase();
    // Block IP literals and obviously local names — we only issue certs for
    // real customer hostnames.
    if (/^[0-9.]+$/.test(host) || /^[0-9a-f:]+$/.test(host)) return false;
    if (host === 'localhost' || host.endsWith('.localhost')) return false;

    try {
      const ds = await getDefaultTenantDataSource();
      const repo = ds.getRepository(TenantDomain);
      const row = await repo.findOne({ where: { domain: host } });
      if (!row) return false;

      // Domain must be VERIFIED or ACTIVE — i.e. DNS proof completed.
      // DNS_FAILED or PENDING (not yet verified) are not allowed to mint
      // certs.
      const ok = row.domainStatus === 'ACTIVE' || row.domainStatus === 'VERIFIED';
      if (!ok) return false;

      if (row.sslStatus === 'DISABLED') {
        await repo.update({ tenantDomainId: row.tenantDomainId }, { sslStatus: 'PENDING' });
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      Logger.warn(`[SSL] caddy-ask lookup failed for ${domain}: ${message}`);
      return false;
    }
  }

  /**
   * Opens a TLS handshake to {host}:443, reads the peer cert, and returns
   * a parsed summary. Never throws — TLS errors are normalised to
   * `CertProbeFailure`.
   */
  static probeCertificate(host: string): Promise<CertProbeResult | CertProbeFailure> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: CertProbeResult | CertProbeFailure) => {
        if (settled) return;
        settled = true;
        try { socket.destroy(); } catch { /* ignore */ }
        resolve(value);
      };

      const socket = tls.connect({
        host,
        port: 443,
        servername: host,
        // Reject untrusted certs — that's the whole point of the probe.
        rejectUnauthorized: true,
        timeout: HANDSHAKE_TIMEOUT_MS,
      });

      socket.once('secureConnect', () => {
        try {
          const cert = socket.getPeerCertificate(false);
          if (!cert || !cert.valid_from || !cert.valid_to) {
            finish({ ok: false, reason: 'empty-cert' });
            return;
          }
          const issuer = cert.issuer
            ? [cert.issuer.O, cert.issuer.CN].filter(Boolean).join(' — ')
            : 'unknown';
          finish({
            ok: true,
            issuer,
            validFrom: new Date(cert.valid_from),
            validTo: new Date(cert.valid_to),
          });
        } catch (err) {
          finish({ ok: false, reason: err instanceof Error ? err.message : 'parse-failure' });
        }
      });

      socket.once('timeout', () => finish({ ok: false, reason: 'handshake-timeout' }));
      socket.once('error', (err: Error) => finish({ ok: false, reason: err.message }));
    });
  }

  /**
   * Run the TLS probe for every ACTIVE custom domain and reconcile the
   * `sslStatus / sslIssuedAt / sslExpiresAt / sslIssuer` fields. Returns
   * tallies for cron logging.
   */
  static async recheckCertificates(): Promise<{
    checked: number;
    activated: number;
    expiring: number;
    failed: number;
  }> {
    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(TenantDomain);
    // Probe everything that's either currently ACTIVE on the DNS side OR
    // sitting in SSL PENDING (Caddy is about to or just did mint a cert).
    const rows = await repo.find({
      where: [
        { domainStatus: 'ACTIVE' },
        { domainStatus: 'VERIFIED' },
        { sslStatus: 'PENDING' },
        { sslStatus: 'ACTIVE' },
        { sslStatus: 'EXPIRING' },
        { sslStatus: 'FAILED' },
      ],
    });

    let checked = 0;
    let activated = 0;
    let expiring = 0;
    let failed = 0;
    const now = new Date();
    const expiringThresholdMs = EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    // Probe in small batches so a slow DNS / slow handshake doesn't stall
    // the cron for every other tenant.
    for (let i = 0; i < rows.length; i += RECHECK_CONCURRENCY) {
      const batch = rows.slice(i, i + RECHECK_CONCURRENCY);
      await Promise.all(batch.map(async (row) => {
        checked += 1;
        const result = await SSLProvisioningService.probeCertificate(row.domain);

        if (!result.ok) {
          failed += 1;
          await repo.update(
            { tenantDomainId: row.tenantDomainId },
            {
              sslStatus: 'FAILED',
              sslLastCheckedAt: now,
            },
          );
          Logger.warn(`[SSL] probe failed for ${row.domain}: ${result.reason}`);
          return;
        }

        const msToExpiry = result.validTo.getTime() - now.getTime();
        let nextStatus: SslStatus = 'ACTIVE';
        if (msToExpiry <= 0) {
          nextStatus = 'FAILED';
          failed += 1;
        } else if (msToExpiry < expiringThresholdMs) {
          nextStatus = 'EXPIRING';
          expiring += 1;
        } else {
          activated += 1;
        }

        await repo.update(
          { tenantDomainId: row.tenantDomainId },
          {
            sslStatus: nextStatus,
            sslIssuedAt: result.validFrom,
            sslExpiresAt: result.validTo,
            sslIssuer: result.issuer,
            sslLastCheckedAt: now,
          },
        );
      }));
    }

    return { checked, activated, expiring, failed };
  }
}
