import SettingService from '@kuraykaraaslan/setting/server/setting.service';

/**
 * The issuer ("seller") identity an e-invoicing adapter needs to stamp onto a
 * document. These are TENANT-level company settings (not plugin-namespaced), so
 * the host resolves them and hands them to the sandboxed adapter as plain input —
 * the isolate can't read the tenant's own settings, only its own plugin namespace.
 */
export interface SellerProfile {
  companyLegalName: string;
  companyTaxId: string;
  euVatNumber: string;
  companyAddressLine1: string;
  companyCity: string;
  companyPostalCode: string;
  companyCountryCode: string;
  companyProvince: string;
}

const SELLER_KEYS = [
  'companyLegalName', 'companyTaxId', 'euVatNumber', 'companyAddressLine1',
  'companyCity', 'companyPostalCode', 'companyCountryCode', 'companyProvince',
] as const;

/** Read the tenant's company/seller identity for an e-invoice submission. */
export async function resolveSellerProfile(tenantId: string): Promise<SellerProfile> {
  const s = await SettingService.getByKeys(tenantId, [...SELLER_KEYS]);
  return {
    companyLegalName: s.companyLegalName ?? '',
    companyTaxId: s.companyTaxId ?? '',
    euVatNumber: s.euVatNumber ?? '',
    companyAddressLine1: s.companyAddressLine1 ?? '',
    companyCity: s.companyCity ?? '',
    companyPostalCode: s.companyPostalCode ?? '',
    companyCountryCode: (s.companyCountryCode ?? '').toUpperCase(),
    companyProvince: s.companyProvince ?? '',
  };
}
