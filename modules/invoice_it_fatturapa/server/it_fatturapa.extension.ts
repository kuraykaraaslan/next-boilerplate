import type { InvoiceAdapterContribution } from '@nb/invoice/server/adapters/invoice.adapter.types';
import ItFatturaPaAdapter from './adapters/it_fatturapa.adapter';

/**
 * FatturaPA (IT) contribution for the `invoice:adapter` extension point. The host
 * (invoice adapters/registry) discovers this via the extension registry and never
 * imports ItFatturaPaAdapter directly. Routing key is in the manifest metadata
 * ({ kind: 'country', code: 'IT' }).
 */
const contribution: InvoiceAdapterContribution = {
  key: 'it_fatturapa',
  create: () => new ItFatturaPaAdapter(),
};

export default contribution;
