import type { InvoiceAdapterContribution } from '@nb/invoice/server/adapters/invoice.adapter.types';
import UsStandardAdapter from './adapters/us_standard.adapter';

/**
 * US Standard (Stripe Tax) contribution for the `invoice:adapter` extension point. The host
 * (invoice adapters/registry) discovers this via the extension registry and never
 * imports UsStandardAdapter directly. Routing key is in the manifest metadata
 * ({ kind: 'region', code: 'US' }).
 */
const contribution: InvoiceAdapterContribution = {
  key: 'us_standard',
  create: () => new UsStandardAdapter(),
};

export default contribution;
