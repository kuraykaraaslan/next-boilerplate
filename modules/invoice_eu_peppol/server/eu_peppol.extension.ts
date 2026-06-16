import type { InvoiceAdapterContribution } from '@nb/invoice/server/adapters/invoice.adapter.types';
import EuPeppolAdapter from './adapters/eu_peppol.adapter';

/**
 * Peppol BIS (EU) contribution for the `invoice:adapter` extension point. The host
 * (invoice adapters/registry) discovers this via the extension registry and never
 * imports EuPeppolAdapter directly. Routing key is in the manifest metadata
 * ({ kind: 'region', code: 'EU' }).
 */
const contribution: InvoiceAdapterContribution = {
  key: 'eu_peppol',
  create: () => new EuPeppolAdapter(),
};

export default contribution;
