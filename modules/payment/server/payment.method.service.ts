import 'reflect-metadata';
import { ILike } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import Logger from '@kuraykaraaslan/logger';
import { PaymentMethodConfig } from './entities/payment_method.entity';
import type { CreatePaymentMethodDTO, UpdatePaymentMethodDTO, GetPaymentMethodsQuery } from './payment.method.dto';
import { PAYMENT_MESSAGES } from './payment.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';

/** Tenant-scoped configurable payment-method (master-data) CRUD. */
export default class PaymentMethodService {
  static async list(tenantId: string, query: GetPaymentMethodsQuery): Promise<{ data: PaymentMethodConfig[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PaymentMethodConfig);
    const where: Record<string, unknown> = { tenantId };
    if (query.search) where['name'] = ILike(`%${query.search}%`);
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data, total };
  }

  static async getById(tenantId: string, methodId: string): Promise<PaymentMethodConfig> {
    const ds = await tenantDataSourceFor(tenantId);
    const row = await ds.getRepository(PaymentMethodConfig).findOne({ where: { tenantId, methodId } });
    if (!row) throw new AppError(PAYMENT_MESSAGES.PAYMENT_METHOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return row;
  }

  static async create(tenantId: string, data: CreatePaymentMethodDTO): Promise<PaymentMethodConfig> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PaymentMethodConfig);
    try {
      return await repo.save(repo.create({ tenantId, ...data }));
    } catch (error) {
      Logger.error(`[PaymentMethodService.create][tenant:${tenantId}] ${error}`);
      throw new AppError(PAYMENT_MESSAGES.PAYMENT_METHOD_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async update(tenantId: string, methodId: string, data: UpdatePaymentMethodDTO): Promise<PaymentMethodConfig> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PaymentMethodConfig);
    const row = await repo.findOne({ where: { tenantId, methodId } });
    if (!row) throw new AppError(PAYMENT_MESSAGES.PAYMENT_METHOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    Object.assign(row, data);
    return await repo.save(row);
  }

  static async delete(tenantId: string, methodId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PaymentMethodConfig);
    const row = await repo.findOne({ where: { tenantId, methodId } });
    if (!row) throw new AppError(PAYMENT_MESSAGES.PAYMENT_METHOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.softRemove(row);
  }
}
