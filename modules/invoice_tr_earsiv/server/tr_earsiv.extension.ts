import type { InvoiceAdapterContribution } from '@nb/invoice/server/adapters/invoice.adapter.types';
import TrEarsivAdapter from './adapters/tr_earsiv.adapter';

/**
 * e-Arşiv (TR) contribution for the `invoice:adapter` extension point. The host
 * (invoice adapters/registry) discovers this via the extension registry and never
 * imports TrEarsivAdapter directly. Routing key is in the manifest metadata
 * ({ kind: 'region', code: 'TR' }).
 */
const contribution: InvoiceAdapterContribution = {
  key: 'tr_earsiv',
  create: () => new TrEarsivAdapter(),
};

export default contribution;
