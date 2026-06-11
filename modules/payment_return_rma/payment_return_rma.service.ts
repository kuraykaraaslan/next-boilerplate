import PaymentReturnRmaCrudService from './payment_return_rma.crud.service';
import PaymentReturnRmaLifecycleService from './payment_return_rma.lifecycle.service';

export { PaymentReturnRmaCrudService, PaymentReturnRmaLifecycleService };

export default class PaymentReturnRmaService {

  // CRUD
  static create        = PaymentReturnRmaCrudService.create.bind(PaymentReturnRmaCrudService);
  static getById       = PaymentReturnRmaCrudService.getById.bind(PaymentReturnRmaCrudService);
  static list          = PaymentReturnRmaCrudService.list.bind(PaymentReturnRmaCrudService);
  static update        = PaymentReturnRmaCrudService.update.bind(PaymentReturnRmaCrudService);

  // Lifecycle
  static approve       = PaymentReturnRmaLifecycleService.approve.bind(PaymentReturnRmaLifecycleService);
  static reject        = PaymentReturnRmaLifecycleService.reject.bind(PaymentReturnRmaLifecycleService);
  static markReceived  = PaymentReturnRmaLifecycleService.markReceived.bind(PaymentReturnRmaLifecycleService);
  static refund        = PaymentReturnRmaLifecycleService.refund.bind(PaymentReturnRmaLifecycleService);
  static complete      = PaymentReturnRmaLifecycleService.complete.bind(PaymentReturnRmaLifecycleService);
  static cancel        = PaymentReturnRmaLifecycleService.cancel.bind(PaymentReturnRmaLifecycleService);
  static listEvents    = PaymentReturnRmaLifecycleService.listEvents.bind(PaymentReturnRmaLifecycleService);
}
