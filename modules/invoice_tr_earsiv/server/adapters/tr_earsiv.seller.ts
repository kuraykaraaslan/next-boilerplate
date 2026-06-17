import SettingService from '@kuraykaraaslan/setting/server/setting.service';

export interface SellerInfo {
  legalName: string;
  taxId: string;
  taxOffice: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  email: string;
  phone: string;
}

export async function loadSellerInfo(tenantId: string): Promise<SellerInfo> {
  const keys = [
    'companyLegalName', 'companyTaxId', 'companyTaxOffice',
    'companyAddressLine1', 'companyCity', 'companyPostalCode',
    'companyCountryCode', 'companyEmail', 'companyPhone',
  ] as const;
  const settings = await SettingService.getByKeys(tenantId, [...keys]);
  return {
    legalName: settings.companyLegalName ?? '',
    taxId: settings.companyTaxId ?? '',
    taxOffice: settings.companyTaxOffice ?? '',
    address: settings.companyAddressLine1 ?? '',
    city: settings.companyCity ?? '',
    postal: settings.companyPostalCode ?? '',
    country: settings.companyCountryCode ?? 'TR',
    email: settings.companyEmail ?? '',
    phone: settings.companyPhone ?? '',
  };
}
