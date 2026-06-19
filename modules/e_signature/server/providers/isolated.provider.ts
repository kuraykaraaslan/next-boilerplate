import BaseESignatureProvider, {
  InitiateLoginInput, InitiateLoginOutput,
} from './base.provider';
import type { CountryCode, PollResult, RawIdentityClaims } from '../e_signature.types';
import type { LoA, ProviderCapability } from '../e_signature.enums';
import ESignatureCryptoService from '../e_signature.crypto.service';

type Invoke = (op: string, input: unknown) => Promise<unknown>;

/**
 * Host-facing facade that runs a national e-signature / eID provider as a SANDBOXED
 * community plugin. The untrusted isolate only does egress (initiate/poll against the
 * national API, hashing/nonce via host.crypto) — it never sees the tenant's seal key
 * and CANNOT parse certificates or verify signatures. All trust-critical work stays
 * HOST-SIDE: signature/chain/OCSP verification runs in the workflow (poll), and
 * `extractClaims` parses the X.509 cert via the vetted crypto service here.
 *
 * The provider's descriptive properties (countries, capabilities, LoA, identifier
 * label/placeholder) come from the manifest extension metadata — no satellite code.
 * `signature`/`certificate` cross the JSON boundary as base64 and are rehydrated to
 * Buffers here so the rest of the engine is unchanged.
 */
export class IsolatedESignatureProvider extends BaseESignatureProvider {
  readonly name: string;
  readonly displayName: string;
  readonly supportedCountries: readonly CountryCode[];
  readonly capabilities: readonly ProviderCapability[];
  readonly defaultLoA: LoA;
  readonly identifierLabel: string;
  readonly identifierPlaceholder?: string;

  private readonly _configured: boolean;
  private readonly invoke: Invoke;

  constructor(key: string, meta: Record<string, unknown>, invoke: Invoke, configured: boolean) {
    super();
    const m = meta ?? {};
    this.name = key;
    this.displayName = String(m.displayName ?? m.label ?? key);
    this.supportedCountries = (Array.isArray(m.countries) ? m.countries : []) as CountryCode[];
    this.capabilities = (Array.isArray(m.capabilities) && m.capabilities.length ? m.capabilities : ['login']) as ProviderCapability[];
    this.defaultLoA = (typeof m.loa === 'string' ? m.loa : 'substantial') as LoA;
    this.identifierLabel = String(m.identifierLabel ?? 'Identifier');
    this.identifierPlaceholder = typeof m.identifierPlaceholder === 'string' ? m.identifierPlaceholder : undefined;
    this._configured = configured;
    this.invoke = invoke;
  }

  isConfigured(): boolean {
    return this._configured;
  }

  /**
   * Permissive host-side check (non-empty). The provider-specific regex +
   * normalisation (e.g. Smart-ID's `PNO{country}-…`) needs the country and runs
   * INSIDE the isolate at `initiateLogin`, which rejects a malformed identifier
   * before any network call — so nothing reaches the national API unvalidated.
   */
  validateIdentifier(identifier: string): { ok: boolean; normalized?: string; error?: string } {
    const t = (identifier ?? '').trim();
    return t ? { ok: true, normalized: t } : { ok: false, error: 'Identifier required' };
  }

  async initiateLogin(input: InitiateLoginInput): Promise<InitiateLoginOutput> {
    return (await this.invoke('initiateLogin', {
      identifier: input.identifier,
      challenge: input.challenge,
      country: input.country ?? null,
    })) as InitiateLoginOutput;
  }

  async pollLoginResult(providerTxnId: string): Promise<PollResult> {
    const r = (await this.invoke('pollLoginResult', { providerTxnId })) as {
      status: PollResult['status'];
      signature?: string;
      certificate?: string;
      providerClaims?: unknown;
      failureReason?: PollResult['failureReason'];
    };
    return {
      status: r.status,
      signature: r.signature ? Buffer.from(r.signature, 'base64') : undefined,
      certificate: r.certificate ? Buffer.from(r.certificate, 'base64') : undefined,
      providerClaims: r.providerClaims,
      failureReason: r.failureReason,
    };
  }

  extractClaims(certificate: Buffer): RawIdentityClaims {
    return ESignatureCryptoService.parseCertificate(certificate);
  }
}
