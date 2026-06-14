import MeterCrudService from './metering.meter.service';
import MeteringRecordService from './metering.record.service';
import MeteredBillingService from './metering.billing.service';

/**
 * Facade over the metering sub-services. Import this for the common operations:
 * meter CRUD, recording usage, reading current usage, and running metered /
 * overage billing. Reach for a specific sub-service only when you need
 * something niche.
 */
export default class MeteringService {
  // Meters
  static createMeter = MeterCrudService.createMeter.bind(MeterCrudService);
  static updateMeter = MeterCrudService.updateMeter.bind(MeterCrudService);
  static getMeter = MeterCrudService.getMeter.bind(MeterCrudService);
  static getMeterByKey = MeterCrudService.getMeterByKey.bind(MeterCrudService);
  static getOrCreateMeter = MeterCrudService.getOrCreate.bind(MeterCrudService);
  static listMeters = MeterCrudService.listMeters.bind(MeterCrudService);
  static deleteMeter = MeterCrudService.deleteMeter.bind(MeterCrudService);

  // Usage
  static recordEvent = MeteringRecordService.recordEvent.bind(MeteringRecordService);
  static aggregate = MeteringRecordService.aggregate.bind(MeteringRecordService);
  static getUsage = MeteringRecordService.getUsage.bind(MeteringRecordService);

  // Billing
  static computeOverage = MeteredBillingService.computeOverage.bind(MeteredBillingService);
  static runBilling = MeteredBillingService.runBilling.bind(MeteredBillingService);
  static listRuns = MeteredBillingService.listRuns.bind(MeteredBillingService);
  static getRun = MeteredBillingService.getRun.bind(MeteredBillingService);
}
