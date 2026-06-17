// saml: HOST-SIDE, vetted SAML 2.0 (XML-DSig). The signing (AuthnRequest) and the
// signature/assertion verification must NOT run in the untrusted isolate, and the SP
// private/decryption keys must never enter it. The isolate passes only NON-SECRET
// config (idp cert, entity ids, endpoints); the broker reads the SP keys from the
// plugin's encrypted secrets host-side, builds a node-saml client, and returns a URL
// (generateAuthUrl) or the neutral validated assertion (validateResponse).
import { SAML } from '@node-saml/node-saml';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { decryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import type { Json } from '../../../sdk/types';
import { SECRET_PREFIX, type BrokerCtx } from '../broker.context';

type SamlVerifyConfig = {
  callbackUrl?: string; idpSsoUrl?: string; spEntityId?: string; idpCertificate?: string;
  signatureAlgorithm?: string; nameIdFormat?: string; wantAssertionsSigned?: boolean;
  acceptedClockSkewMs?: number; signRequests?: boolean; authnContextClassRefs?: string[];
  racComparison?: 'exact' | 'minimum' | 'maximum' | 'better'; disableRequestedAuthnContext?: boolean;
};

/** Read an SP key from the plugin's encrypted secret store (host-side only). */
async function readSecret(ctx: BrokerCtx, name: string): Promise<string | undefined> {
  const raw = await SettingService.getValue(ctx.tenantId, SECRET_PREFIX(ctx.pluginId) + name);
  if (raw == null) return undefined;
  const dec = decryptFieldOpt(raw);
  return typeof dec === 'string' && dec.length ? dec : undefined;
}

/** Build a node-saml client from non-secret config + host-side SP keys. */
async function buildClient(ctx: BrokerCtx, c: SamlVerifyConfig): Promise<SAML> {
  if (!c.idpCertificate) throw new Error('saml: idpCertificate required');
  const spPrivateKey = await readSecret(ctx, 'spPrivateKey');
  const spDecryptionKey = (await readSecret(ctx, 'spDecryptionKey')) ?? spPrivateKey;
  const signing = (c.signRequests ?? true) && Boolean(spPrivateKey);
  return new SAML({
    callbackUrl: c.callbackUrl,
    entryPoint: c.idpSsoUrl,
    issuer: c.spEntityId,
    idpCert: c.idpCertificate,
    privateKey: signing ? spPrivateKey : undefined,
    decryptionPvk: spDecryptionKey,
    signatureAlgorithm: (c.signatureAlgorithm as 'sha1' | 'sha256' | 'sha512') ?? 'sha256',
    identifierFormat: c.nameIdFormat ?? undefined,
    wantAssertionsSigned: c.wantAssertionsSigned ?? true,
    acceptedClockSkewMs: typeof c.acceptedClockSkewMs === 'number' ? c.acceptedClockSkewMs : 5000,
    ...(c.authnContextClassRefs?.length
      ? { authnContext: c.authnContextClassRefs, racComparison: c.racComparison ?? 'minimum' }
      : c.disableRequestedAuthnContext ? { disableRequestedAuthnContext: true } : {}),
  } as ConstructorParameters<typeof SAML>[0]);
}

export const saml = {
  /** Build (and sign, if an SP key is set) the SP-initiated SSO redirect URL. */
  async generateAuthUrl(ctx: BrokerCtx, relayState: string, config: SamlVerifyConfig): Promise<Json> {
    const client = await buildClient(ctx, config ?? {});
    return (await client.getAuthorizeUrlAsync(String(relayState ?? ''), '', {})) as Json;
  },

  /** Validate a signed SAML POST response → neutral assertion (attributes + nameId). */
  async validateResponse(ctx: BrokerCtx, body: Record<string, string>, config: SamlVerifyConfig): Promise<Json> {
    const client = await buildClient(ctx, config ?? {});
    let profile: Record<string, unknown> | null;
    try {
      ({ profile } = (await client.validatePostResponseAsync(body)) as { profile: Record<string, unknown> | null });
    } catch {
      throw new Error('saml: invalid response');
    }
    if (!profile) throw new Error('saml: no assertion');

    const attributes: Record<string, Json> = {};
    for (const [k, v] of Object.entries(profile)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || Array.isArray(v)) {
        attributes[k] = v as Json;
      }
    }
    return {
      attributes,
      nameId: (profile.nameID as string | undefined) ?? null,
      nameIdFormat: (profile.nameIDFormat as string | undefined) ?? null,
      sessionIndex: (profile.sessionIndex as string | undefined) ?? null,
      assertionId: (profile.ID as string | undefined) ?? null,
    } as Json;
  },
};
