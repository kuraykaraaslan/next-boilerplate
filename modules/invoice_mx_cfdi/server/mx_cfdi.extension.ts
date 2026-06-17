import type { InvoiceAdapterContribution } from '@kuraykaraaslan/invoice/server/adapters/invoice.adapter.types';
import MxCfdiAdapter from './adapters/mx_cfdi.adapter';

/**
 * CFDI (MX) contribution for the `invoice:adapter` extension point. The host
 * (invoice adapters/registry) discovers this via the extension registry and never
 * imports MxCfdiAdapter directly. Routing key is in the manifest metadata
 * ({ kind: 'country', code: 'MX' }).
 */
const contribution: InvoiceAdapterContribution = {
  key: 'mx_cfdi',
  create: () => new MxCfdiAdapter(),
};

export default contribution;
