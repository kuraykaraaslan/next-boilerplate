import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '@kuraykaraaslan/payment/server/entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from '@kuraykaraaslan/payment/server/entities/plan_feature.entity';
import Logger from '@kuraykaraaslan/logger';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { PlanFeatureSchema, type PlanFeature } from './tenant_subscription.types';
import type { CreateFeatureDTO, UpdateFeatureDTO } from './tenant_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';

export default class TenantPlanFeatureService {

  static async addFeature(tenantId: string, planId: string, data: CreateFeatureDTO): Promise<PlanFeature> {
    const ds = await tenantDataSourceFor(tenantId);
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    try {
      const repo = ds.getRepository(PlanFeatureEntity);
      const feature = repo.create({ tenantId, planId, key: data.key, label: data.label, type: data.type, value: data.value, sortOrder: data.sortOrder });
      return PlanFeatureSchema.parse(await repo.save(feature));
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === '23505') {
        throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_KEY_EXISTS, 409, ErrorCode.CONFLICT);
      }
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async updateFeature(tenantId: string, featureId: string, data: UpdateFeatureDTO): Promise<PlanFeature> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PlanFeatureEntity);
    const existing = await repo.findOne({ where: { tenantId, featureId } });
    if (!existing) throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    try {
      await repo.update({ tenantId, featureId }, { key: data.key, label: data.label, type: data.type, value: data.value, sortOrder: data.sortOrder } as any);
      return PlanFeatureSchema.parse((await repo.findOne({ where: { tenantId, featureId } }))!);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === '23505') {
        throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_KEY_EXISTS, 409, ErrorCode.CONFLICT);
      }
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async removeFeature(tenantId: string, featureId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const existing = await ds.getRepository(PlanFeatureEntity).findOne({ where: { tenantId, featureId } });
    if (!existing) throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    try {
      await ds.getRepository(PlanFeatureEntity).delete({ tenantId, featureId });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async getFeaturesByPlan(tenantId: string, planId: string): Promise<PlanFeature[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const features = await ds.getRepository(PlanFeatureEntity).find({ where: { tenantId, planId }, order: { sortOrder: 'ASC' } });
    return features.map((f) => PlanFeatureSchema.parse(f));
  }
}
