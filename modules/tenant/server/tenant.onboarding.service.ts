import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';

export type OnboardingStep =
  | 'dns_configured'
  | 'mail_configured'
  | 'payment_configured'
  | 'branding_configured'
  | 'first_member_invited'
  | 'storage_configured';

export type OnboardingChecklist = Record<OnboardingStep, boolean>;

export default class TenantOnboardingService {

  static async getChecklist(tenantId: string): Promise<{ checklist: OnboardingChecklist; completedCount: number; total: number }> {
    const settings = await SettingService.getAllAsRecord(tenantId).catch(() => ({} as Record<string, string>));

    const checklist: OnboardingChecklist = {
      dns_configured: await this.isDnsConfigured(tenantId),
      mail_configured: !!(settings.mailProvider && settings.mailProvider !== 'smtp') ||
                       !!(settings.smtpHost),
      payment_configured: !!(settings.stripePublicKey || settings.paypalClientId || settings.iyzicoApiKey),
      branding_configured: !!(settings.siteName || settings.logoUrl),
      first_member_invited: await this.hasMembers(tenantId),
      storage_configured: !!(settings.storageProvider && settings.storageProvider !== 'local'),
    };

    const completedCount = Object.values(checklist).filter(Boolean).length;
    const total = Object.keys(checklist).length;

    return { checklist, completedCount, total };
  }

  private static async isDnsConfigured(tenantId: string): Promise<boolean> {
    try {
      const { default: TenantDomainService } = await import('@kuraykaraaslan/tenant_domain/server/tenant_domain.service');
      const result = await TenantDomainService.getByTenantId({ tenantId, page: 0, pageSize: 10 }).catch(() => ({ domains: [] }));
      return (result as any).domains?.some((d: any) => d.verifiedAt) ?? false;
    } catch {
      return false;
    }
  }

  private static async hasMembers(tenantId: string): Promise<boolean> {
    try {
      const { default: TenantMemberService } = await import('@kuraykaraaslan/tenant_member/server/tenant_member.service');
      const result = await TenantMemberService.getByTenantId({ tenantId, page: 0, pageSize: 2, search: null, memberRole: null, memberStatus: null }).catch(() => ({ total: 0 }));
      return (result as any).total > 1;
    } catch {
      return false;
    }
  }
}
