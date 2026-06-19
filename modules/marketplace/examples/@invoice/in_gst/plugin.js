// GST e-invoice (IRP) adapter for India — sandboxed. Builds the real IRP JSON
// (schema 1.1) the Invoice Registration Portal (via a GSP/ASP) expects in order
// to return an IRN + signed QR code, and POSTs it to the tenant-configured
// IRP/GSP endpoint. GST splits tax into CGST+SGST (intra-state) or IGST
// (inter-state) based on whether the supplier and recipient state codes match.
// The IRN is assigned by the IRP — we never invent one. With no endpoint the
// adapter returns status 'noop'; a failed registration throws. Ported from the
// built-in invoice_in_gst adapter + builder.

// ── shared helper (ported from invoice/adapters/xml.util — only readAddress is used) ──
function readAddress(addr) {
  const a = addr || {};
  return {
    line: String(a.line1 != null ? a.line1 : a.addressLine1 != null ? a.addressLine1 : a.street != null ? a.street : a.line != null ? a.line : ''),
    city: String(a.city != null ? a.city : a.town != null ? a.town : ''),
    postal: String(a.postalCode != null ? a.postalCode : a.postal_code != null ? a.postal_code : a.zip != null ? a.zip : ''),
    region: String(a.region != null ? a.region : a.state != null ? a.state : a.province != null ? a.province : ''),
  };
}

function round2(n) { return Math.round((n || 0) * 100) / 100; }

// DD/MM/YYYY — deterministic equivalent of the original new Date(d).toLocaleDateString('en-GB').
function ddmmyyyy(d) {
  const dt = d ? new Date(d) : new Date();
  const day = String(dt.getUTCDate()).padStart(2, '0');
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const year = String(dt.getUTCFullYear());
  return day + '/' + month + '/' + year;
}

// ── IRP JSON builder (ported from invoice/adapters/in_gst.builder) ───────────────
function buildGstEInvoice(params) {
  const invoice = params.invoice;
  const lines = params.lines || [];
  const supplier = params.supplier;
  const buyer = readAddress(invoice.customerAddress);
  // Recipient state code: prefer the structured address region, else mirror supplier (intra-state).
  const buyerStateCode = (buyer.region || supplier.stateCode).slice(0, 2);
  const interState = buyerStateCode !== supplier.stateCode;

  let totAssVal = 0;
  let totCgst = 0;
  let totSgst = 0;
  let totIgst = 0;

  const itemList = lines.map((l, i) => {
    const assAmt = round2((l.unitPrice || 0) * (l.quantity || 0));
    const gstRate = round2((l.taxRate || 0) * 100);
    const taxAmt = round2(l.taxAmount || 0);
    const igst = interState ? taxAmt : 0;
    const cgst = interState ? 0 : round2(taxAmt / 2);
    const sgst = interState ? 0 : round2(taxAmt / 2);
    totAssVal += assAmt; totCgst += cgst; totSgst += sgst; totIgst += igst;
    return {
      SlNo: String(i + 1),
      PrdDesc: String(l.description || 'Item').slice(0, 300),
      IsServc: 'Y',
      HsnCd: '998314',
      Qty: l.quantity != null ? l.quantity : 1,
      Unit: 'OTH',
      UnitPrice: round2(l.unitPrice || 0),
      TotAmt: assAmt,
      AssAmt: assAmt,
      GstRt: gstRate,
      IgstAmt: igst,
      CgstAmt: cgst,
      SgstAmt: sgst,
      TotItemVal: round2(assAmt + taxAmt),
    };
  });

  const documentType = invoice.metadata && invoice.metadata.documentType;

  return {
    Version: '1.1',
    TranDtls: { TaxSch: 'GST', SupTyp: 'B2B' },
    DocDtls: {
      Typ: documentType === 'credit_note' ? 'CRN' : 'INV',
      No: invoice.invoiceNumber,
      Dt: ddmmyyyy(invoice.issueDate),
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

globalThis.__plugin = {
  providers: {
    'invoice:adapter': {
      // Configured once the tenant has set an IRP/GSP endpoint to submit to.
      isConfigured: async (_input, host) => {
        return Boolean(await host.settings.get('gstIrpUrl'));
      },

      submit: async ({ invoice, lines, seller }, host) => {
        const irpUrl = await host.settings.get('gstIrpUrl');
        const gstin = (await host.settings.get('gstGstin')) || '';
        const stateCode = (await host.settings.get('gstStateCode')) || '';

        // No IRP configured → noop (never invent an IRN).
        if (!irpUrl) {
          return { status: 'noop' };
        }

        const payload = buildGstEInvoice({
          invoice,
          lines,
          supplier: {
            gstin: gstin,
            legalName: (seller && seller.companyLegalName) || '',
            addressLine: (seller && seller.companyAddressLine1) || '',
            city: (seller && seller.companyCity) || '',
            pincode: (seller && seller.companyPostalCode) || '',
            stateCode: stateCode || gstin.slice(0, 2),
          },
        });

        const res = await host.http.fetch(irpUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            // Bearer token injected host-side; the placeholder is dropped when no secret is set.
            authorization: 'Bearer {{secret:gstIrpToken}}',
          },
          body: JSON.stringify(payload),
        });

        const text = String(res.body == null ? '' : res.body);
        if (res.status >= 400) throw new Error('GST IRP ' + res.status + ': ' + text.slice(0, 500));

        let irn;
        try {
          const j = JSON.parse(text);
          irn = j.Irn || j.irn || (j.data && j.data.Irn);
        } catch (_e) { /* non-JSON */ }

        return { externalId: irn, status: irn ? 'accepted' : 'submitted', raw: { irp: irpUrl } };
      },

      // IRN cancellation is allowed within 24h, then a credit note must be issued
      // — no transmission to undo from the isolate here (matches the original).
      cancel: async () => null,
    },
  },
};
