import type { InvoiceAdapterContribution } from '@kuraykaraaslan/invoice/server/adapters/invoice.adapter.types';
import FrChorusProAdapter from './adapters/fr_choruspro.adapter';

/**
 * Chorus Pro (FR) contribution for the `invoice:adapter` extension point. The host
 * (invoice adapters/registry) discovers this via the extension registry and never
 * imports FrChorusProAdapter directly. Routing key is in the manifest metadata
 * ({ kind: 'country', code: 'FR' }).
 */
const contribution: InvoiceAdapterContribution = {
  key: 'fr_choruspro',
  create: () => new FrChorusProAdapter(),
};

export default contribution;
