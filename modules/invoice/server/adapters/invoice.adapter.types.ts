import type { InvoiceAdapter } from './base.adapter';

/**
 * Contribution shape for the `invoice:adapter` extension point. A satellite
 * module (e.g. invoice_tr_earsiv) default-exports one of these; the host
 * (invoice adapters/registry) discovers it via the extension registry and never
 * imports the adapter class directly.
 *
 * The region/country routing key lives in the manifest contribution `metadata`
 * (`{ kind: 'region' | 'country', code: 'TR' }`), read off the extension
 * registry — the contribution itself only constructs the adapter.
 */
export interface InvoiceAdapterContribution {
  /** Stable adapter key (e.g. 'tr_earsiv'); must equal the manifest contribution key. */
  readonly key: string;
  /** Instantiate the e-invoicing adapter implementation. */
  create(): InvoiceAdapter;
}

/** Routing metadata carried on each `invoice:adapter` contribution. */
export interface InvoiceAdapterMetadata {
  /** 'region' adapters are selected by the tenant's billing region; 'country' by issuer country. */
  kind: 'region' | 'country';
  /** ISO-ish routing code: region ('TR'|'EU'|'US') or issuer country ('IT'|'FR'|…). */
  code: string;
  label?: string;
}
