import type { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import type { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';
import { readAddress } from '@nb/invoice/server/adapters/xml.util';

/**
 * India **GST e-invoice (IRP) JSON** builder — schema v1.1, the payload the
 * Invoice Registration Portal (via a GSP/ASP) expects in order to return an
 * IRN + signed QR code. This produces the real request object; the adapter
 * POSTs it to the tenant's configured IRP/GSP endpoint. The IRN is assigned by
 * the IRP — we never invent one.
 *
 * GST splits tax into CGST+SGST (intra-state) or IGST (inter-state) based on
 * whether the supplier and recipient state codes match.
 */

export interface GstSupplier {
  gstin: string;
  legalName: string;
  addressLine: string;
  city: string;
  pincode: string;
  stateCode: string; // GST state code, e.g. '29'
}

export interface BuildGstParams {
  invoice: Invoice;
  lines: InvoiceLine[];
  supplier: GstSupplier;
}

const round2 = (n: number) => Math.round((n ?? 0) * 100) / 100;

export interface GstEInvoicePayload {
  Version: string;
  TranDtls: { TaxSch: string; SupTyp: string };
  DocDtls: { Typ: string; No: string; Dt: string };
  SellerDtls: Record<string, unknown>;
  BuyerDtls: Record<string, unknown>;
  ItemList: Array<Record<string, unknown>>;
  ValDtls: Record<string, number>;
}

export function buildGstEInvoice(params: BuildGstParams): GstEInvoicePayload {
  const { invoice, lines, supplier } = params;
  const buyer = readAddress(invoice.customerAddress);
  // Recipient state code: prefer the structured address region, else mirror supplier (intra-state).
  const buyerStateCode = (buyer.region || supplier.stateCode).slice(0, 2);
  const interState = buyerStateCode !== supplier.stateCode;

  let totAssVal = 0;
  let totCgst = 0;
  let totSgst = 0;
  let totIgst = 0;

  const itemList = lines.map((l, i) => {
    const assAmt = round2((l.unitPrice ?? 0) * (l.quantity ?? 0));
    const gstRate = round2((l.taxRate ?? 0) * 100);
    const taxAmt = round2(l.taxAmount ?? 0);
    const igst = interState ? taxAmt : 0;
    const cgst = interState ? 0 : round2(taxAmt / 2);
    const sgst = interState ? 0 : round2(taxAmt / 2);
    totAssVal += assAmt; totCgst += cgst; totSgst += sgst; totIgst += igst;
    return {
      SlNo: String(i + 1),
      PrdDesc: (l.description || 'Item').slice(0, 300),
      IsServc: 'Y',
      HsnCd: '998314',
      Qty: l.quantity ?? 1,
      Unit: 'OTH',
      UnitPrice: round2(l.unitPrice ?? 0),
      TotAmt: assAmt,
      AssAmt: assAmt,
      GstRt: gstRate,
      IgstAmt: igst,
      CgstAmt: cgst,
      SgstAmt: sgst,
      TotItemVal: round2(assAmt + taxAmt),
    };
  });

  return {
    Version: '1.1',
    TranDtls: { TaxSch: 'GST', SupTyp: 'B2B' },
    DocDtls: {
      Typ: invoice.metadata && (invoice.metadata as { documentType?: string }).documentType === 'credit_note' ? 'CRN' : 'INV',
      No: invoice.invoiceNumber,
      Dt: new Date(invoice.issueDate).toLocaleDateString('en-GB').replace(/\//g, '/'), // DD/MM/YYYY
    },
    SellerDtls: {
      Gstin: supplier.gstin,
      LglNm: supplier.legalName,
      Addr1: supplier.addressLine || 'NA',
      Loc: supplier.city || 'NA',
      Pin: Number(supplier.pincode) || 0,
      Stcd: supplier.stateCode,
    },
    BuyerDtls: {
      Gstin: invoice.customerTaxId || 'URP',
      LglNm: invoice.customerName,
      Pos: buyerStateCode,
      Addr1: buyer.line || 'NA',
      Loc: buyer.city || 'NA',
      Pin: Number(buyer.postal) || 0,
      Stcd: buyerStateCode,
    },
    ItemList: itemList,
    ValDtls: {
      AssVal: round2(totAssVal),
      CgstVal: round2(totCgst),
      SgstVal: round2(totSgst),
      IgstVal: round2(totIgst),
      TotInvVal: round2(invoice.totalAmount),
    },
  };
}
