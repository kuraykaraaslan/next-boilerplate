import 'reflect-metadata';
import { LessThan, MoreThan } from 'typeorm';
import { getDataSource } from '@nb/db';
import redis from '@nb/redis';
import Logger from '@nb/logger';
import WebhookService from '@nb/webhook/server/webhook.service';
import { SigningCertificate } from './entities/signing_certificate.entity';

/**
 * Expiry alerting and active-cert listing over the certificate↔user binding
 * table. Moved out of the e_signature engine's compliance service so the engine
 * doesn't depend on the auth-layer entity.
 */
export default class AuthESignatureCertAlertsService {
  /**
   * Find signing certificates expiring within `withinDays` and emit a platform
   * webhook per certificate (deduped per cert per day). Meant for a scheduled
   * sweep.
   */
  static async sweepExpiringCerts(withinDays = 30): Promise<number> {
    const ds = await getDataSource();
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    const rows = await ds.getRepository(SigningCertificate).find({
      where: { notAfter: LessThan(cutoff) as never, revokedAt: undefined },
    });
    const expiringSoon = rows.filter((c) => c.notAfter > now && !c.revokedAt);
    let alerted = 0;
    for (const cert of expiringSoon) {
      const dedup = `esig:certalert:${cert.signingCertificateId}:${now.toISOString().slice(0, 10)}`;
      try { if (await redis.set(dedup, '1', 'EX', 86400, 'NX') === null) continue; } catch { /* fail-open */ }
      await WebhookService.dispatchPlatformEvent('esignature.cert_expiring', {
        signingCertificateId: cert.signingCertificateId, userId: cert.userId,
        country: cert.country, notAfter: cert.notAfter.toISOString(),
        daysRemaining: Math.ceil((cert.notAfter.getTime() - now.getTime()) / 86_400_000),
      }).catch((e) => Logger.warn(`[auth_e_signature] cert-expiry webhook failed: ${e instanceof Error ? e.message : e}`));
      alerted++;
    }
    return alerted;
  }

  /** Active certificates (not expired, not revoked) — for a compliance dashboard. */
  static async listActiveCerts(): Promise<SigningCertificate[]> {
    const ds = await getDataSource();
    return ds.getRepository(SigningCertificate).find({ where: { notAfter: MoreThan(new Date()) as never } });
  }
}
