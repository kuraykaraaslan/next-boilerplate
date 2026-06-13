import 'reflect-metadata';
import 'dotenv/config';
import { getDataSource } from '@/modules/db';
import InvoicePdfService from '@/modules/invoice/invoice.pdf.service';
import InvoiceMessages from '@/modules/invoice/invoice.messages';
import { Invoice } from '@/modules/invoice/entities/invoice.entity';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';

const INV = '3254234b-a7d2-4d67-b084-4f2b7bd601e2';
(async () => {
  const ds = await getDataSource();
  // 1) column exists?
  const cols = await ds.query("SELECT column_name FROM information_schema.columns WHERE table_name='invoices' AND column_name='providerPdfUrl'");
  console.log('RESULT columnExists=' + (cols.length > 0));

  const repo = ds.getRepository(Invoice);
  // 2) self-render path (no providerPdfUrl)
  await repo.update({ invoiceId: INV }, { providerPdfUrl: undefined } as any);
  const selfBuf = await InvoicePdfService.render(ROOT_TENANT_ID, INV);
  console.log('RESULT selfRender=' + selfBuf.subarray(0,5).toString('latin1') + ' bytes=' + selfBuf.length);

  // 3) provider path with unreachable url → must throw PROVIDER_PDF_UNAVAILABLE (no silent self-render)
  await repo.update({ invoiceId: INV }, { providerPdfUrl: 'https://127.0.0.1:9/none.pdf' });
  let threw = '';
  try { await InvoicePdfService.render(ROOT_TENANT_ID, INV); }
  catch (e: any) { threw = e?.message ?? String(e); }
  console.log('RESULT providerUnreachableThrew=' + JSON.stringify(threw) + ' matches=' + (threw === InvoiceMessages.PROVIDER_PDF_UNAVAILABLE));

  // reset
  await repo.update({ invoiceId: INV }, { providerPdfUrl: null } as any);
  console.log('RESULT reset=ok');
  await ds.destroy();
})().catch(e => { console.error('ERR', e?.message ?? e); process.exit(1); });
