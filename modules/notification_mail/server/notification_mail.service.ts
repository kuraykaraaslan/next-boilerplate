import NotificationMailProviderService from './notification_mail.provider.service';
import NotificationMailQueueService from './notification_mail.queue.service';

export { NotificationMailProviderService, NotificationMailQueueService };
export type { MailProviderType } from './notification_mail.provider.service';

export default class MailService {

  // Provider
  static readonly DEFAULT_PROVIDER = NotificationMailProviderService.DEFAULT_PROVIDER;
  static readonly TEMPLATE_PATH   = NotificationMailProviderService.TEMPLATE_PATH;

  // Queue / BullMQ
  static readonly QUEUE_NAME      = NotificationMailQueueService.QUEUE_NAME;
  static readonly QUEUE           = NotificationMailQueueService.QUEUE;
  static readonly WORKER          = NotificationMailQueueService.WORKER;

  // Config constants
  static readonly APPLICATION_NAME             = NotificationMailQueueService.APPLICATION_NAME;
  static readonly APPLICATION_HOST             = NotificationMailQueueService.APPLICATION_HOST;
  static readonly MAIL_FROM                    = NotificationMailQueueService.MAIL_FROM;
  static readonly FRONTEND_URL                 = NotificationMailQueueService.FRONTEND_URL;
  static readonly FRONTEND_LOGIN_PATH          = NotificationMailQueueService.FRONTEND_LOGIN_PATH;
  static readonly FRONTEND_REGISTER_PATH       = NotificationMailQueueService.FRONTEND_REGISTER_PATH;
  static readonly FRONTEND_PRIVACY_PATH        = NotificationMailQueueService.FRONTEND_PRIVACY_PATH;
  static readonly FRONTEND_TERMS_PATH          = NotificationMailQueueService.FRONTEND_TERMS_PATH;
  static readonly FRONTEND_RESET_PASSWORD_PATH = NotificationMailQueueService.FRONTEND_RESET_PASSWORD_PATH;
  static readonly FRONTEND_FORGOT_PASSWORD_PATH = NotificationMailQueueService.FRONTEND_FORGOT_PASSWORD_PATH;
  static readonly FRONTEND_SUPPORT_EMAIL       = NotificationMailQueueService.FRONTEND_SUPPORT_EMAIL;
  static readonly INFORM_MAIL                  = NotificationMailQueueService.INFORM_MAIL;
  static readonly INFORM_NAME                  = NotificationMailQueueService.INFORM_NAME;

  // Methods
  static getProvider           = NotificationMailProviderService.getProvider.bind(NotificationMailProviderService);
  static listProviders         = NotificationMailProviderService.listProviders.bind(NotificationMailProviderService);
  static renderTemplate        = NotificationMailProviderService.renderTemplate.bind(NotificationMailProviderService);
  static assertMailFeatureAccess = NotificationMailQueueService.assertMailFeatureAccess.bind(NotificationMailQueueService);
  static sendMail              = NotificationMailQueueService.sendMail.bind(NotificationMailQueueService);
  static sendMailDirect        = NotificationMailQueueService.sendMailDirect.bind(NotificationMailQueueService);
}
