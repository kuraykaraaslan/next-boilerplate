import type { InvoiceAdapterContribution } from '@kuraykaraaslan/invoice/server/adapters/invoice.adapter.types';
import DeZugferdAdapter from './adapters/de_zugferd.adapter';

/**
 * ZUGFeRD (DE) contribution for the `invoice:adapter` extension point. The host
 * (invoice adapters/registry) discovers this via the extension registry and never
 * imports DeZugferdAdapter directly. Routing key is in the manifest metadata
 * ({ kind: 'country', code: 'DE' }).
 */
const contribution: InvoiceAdapterContribution = {
  key: 'de_zugferd',
  create: () => new DeZugferdAdapter(),
};

export default contribution;
