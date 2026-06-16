import NotificationSmsProviderService from './notification_sms.provider.service';
import NotificationSmsQueueService from './notification_sms.queue.service';

export { NotificationSmsProviderService, NotificationSmsQueueService };
export type { SMSProviderType } from './notification_sms.provider.service';

export default class SMSService {

  // ──────────────────────────────────────────────
  // Provider registry
  // ──────────────────────────────────────────────

  static readonly phoneLibInstance = NotificationSmsProviderService.phoneLibInstance;
  static readonly ALLOWED_COUNTRIES = NotificationSmsProviderService.ALLOWED_COUNTRIES;
  static readonly DEFAULT_PROVIDER_NAME = NotificationSmsProviderService.DEFAULT_PROVIDER_NAME;
  static readonly REGION_PROVIDER_MAP   = NotificationSmsProviderService.REGION_PROVIDER_MAP;

  static getProvider         = NotificationSmsProviderService.getProvider.bind(NotificationSmsProviderService);
  static listProviders       = NotificationSmsProviderService.listProviders.bind(NotificationSmsProviderService);
  static getRegionProviderMap = NotificationSmsProviderService.getRegionProviderMap.bind(NotificationSmsProviderService);
  static getProviderForRegion = NotificationSmsProviderService.getProviderForRegion.bind(NotificationSmsProviderService);
  static parsePhoneNumber    = NotificationSmsProviderService.parsePhoneNumber.bind(NotificationSmsProviderService);
  static isAllowedCountry    = NotificationSmsProviderService.isAllowedCountry.bind(NotificationSmsProviderService);
  static isValidPhoneNumber  = NotificationSmsProviderService.isValidPhoneNumber.bind(NotificationSmsProviderService);

  // ──────────────────────────────────────────────
  // Queue / send
  // ──────────────────────────────────────────────

  static readonly QUEUE_NAME        = NotificationSmsQueueService.QUEUE_NAME;
  static readonly RATE_LIMIT_SECONDS = NotificationSmsQueueService.RATE_LIMIT_SECONDS;
  static readonly RATE_LIMIT_PREFIX  = NotificationSmsQueueService.RATE_LIMIT_PREFIX;
  static readonly QUEUE             = NotificationSmsQueueService.QUEUE;
  static readonly WORKER            = NotificationSmsQueueService.WORKER;

  static assertSmsFeatureAccess  = NotificationSmsQueueService.assertSmsFeatureAccess.bind(NotificationSmsQueueService);
  static sendShortMessage        = NotificationSmsQueueService.sendShortMessage.bind(NotificationSmsQueueService);
  static sendShortMessageDirect  = NotificationSmsQueueService.sendShortMessageDirect.bind(NotificationSmsQueueService);
}
