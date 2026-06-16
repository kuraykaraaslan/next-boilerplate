import type { InvoiceAdapterContribution } from '@nb/invoice/server/adapters/invoice.adapter.types';
import InGstAdapter from './adapters/in_gst.adapter';

/**
 * GST IRP (IN) contribution for the `invoice:adapter` extension point. The host
 * (invoice adapters/registry) discovers this via the extension registry and never
 * imports InGstAdapter directly. Routing key is in the manifest metadata
 * ({ kind: 'country', code: 'IN' }).
 */
const contribution: InvoiceAdapterContribution = {
  key: 'in_gst',
  create: () => new InGstAdapter(),
};

export default contribution;
