import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import { ILike } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { MeterDefinition as MeterDefinitionEntity } from './entities/meter_definition.entity';
import { MeterDefinitionSchema, type MeterDefinition } from './metering.types';
import type { CreateMeterDTO, ListMetersQuery, UpdateMeterDTO } from './metering.dto';
import { METERING_MESSAGES as MESSAGES } from './metering.messages';
import { DEFAULT_CURRENCY } from './metering.constants';

const UNIQUE_VIOLATION = '23505';

/**
 * CRUD over `MeterDefinition`. Meters are the dictionary of billable usage
 * dimensions for a tenant. Creation/`getOrCreate` is idempotent on
 * (tenant, key) — the unique index makes concurrent creates race-safe.
 */
export default class MeterCrudService {
  /** Create a new meter. Conflicts on (tenant, key) raise a 409. */
  static async createMeter(tenantId: string, dto: CreateMeterDTO): Promise<MeterDefinition> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MeterDefinitionEntity);
    try {
      const saved = await repo.save(
        repo.create({
          tenantId,
          key: dto.key,
          name: dto.name,
          unit: dto.unit,
          aggregation: dto.aggregation,
          unitPriceMinor: BigInt(dto.unitPriceMinor),
          currency: dto.currency ?? DEFAULT_CURRENCY,
          includedQuantity: BigInt(dto.includedQuantity),
          active: dto.active,
          metadata: dto.metadata ?? null,
        }),
      );
      return MeterDefinitionSchema.parse(saved);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new AppError(MESSAGES.METER_KEY_CONFLICT, 409, ErrorCode.CONFLICT);
      }
      throw error;
    }
  }

  /** Find a meter by (tenant, key) or create it from `defaults` — idempotent. */
  static async getOrCreate(
    tenantId: string,
    key: string,
    defaults: Omit<CreateMeterDTO, 'key'>,
  ): Promise<MeterDefinition> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MeterDefinitionEntity);
    const existing = await repo.findOne({ where: { tenantId, key } });
    if (existing) return MeterDefinitionSchema.parse(existing);
    try {
      return await MeterCrudService.createMeter(tenantId, { key, ...defaults });
    } catch (error) {
      // Lost the create race — re-read the now-existing row.
      if (error instanceof AppError && error.statusCode === 409) {
        const row = await repo.findOne({ where: { tenantId, key } });
        if (row) return MeterDefinitionSchema.parse(row);
      }
      throw error;
    }
  }

  /** Patch a draft meter's mutable fields. */
  static async updateMeter(
    tenantId: string,
    meterId: string,
    dto: UpdateMeterDTO,
  ): Promise<MeterDefinition> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MeterDefinitionEntity);
    const meter = await repo.findOne({ where: { tenantId, meterId } });
    if (!meter) throw new AppError(MESSAGES.METER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    if (dto.name !== undefined) meter.name = dto.name;
    if (dto.unit !== undefined) meter.unit = dto.unit;
    if (dto.aggregation !== undefined) meter.aggregation = dto.aggregation;
    if (dto.unitPriceMinor !== undefined) meter.unitPriceMinor = BigInt(dto.unitPriceMinor);
    if (dto.currency !== undefined) meter.currency = dto.currency;
    if (dto.includedQuantity !== undefined) meter.includedQuantity = BigInt(dto.includedQuantity);
    if (dto.active !== undefined) meter.active = dto.active;
    if (dto.metadata !== undefined) meter.metadata = dto.metadata;

    const saved = await repo.save(meter);
    return MeterDefinitionSchema.parse(saved);
  }

  static async getMeter(tenantId: string, meterId: string): Promise<MeterDefinition> {
    const ds = await tenantDataSourceFor(tenantId);
    const meter = await ds
      .getRepository(MeterDefinitionEntity)
      .findOne({ where: { tenantId, meterId } });
    if (!meter) throw new AppError(MESSAGES.METER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return MeterDefinitionSchema.parse(meter);
  }

  /** Resolve a meter by its tenant-stable key (raises 404 when absent). */
  static async getMeterByKey(tenantId: string, key: string): Promise<MeterDefinition> {
    const ds = await tenantDataSourceFor(tenantId);
    const meter = await ds
      .getRepository(MeterDefinitionEntity)
      .findOne({ where: { tenantId, key } });
    if (!meter) throw new AppError(MESSAGES.METER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return MeterDefinitionSchema.parse(meter);
  }

  static async listMeters(
    tenantId: string,
    query: ListMetersQuery,
  ): Promise<{ data: MeterDefinition[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: FindOptionsWhere<MeterDefinitionEntity> = { tenantId };
    if (query.active !== undefined) where.active = query.active;
    if (query.q) where.name = ILike(`%${query.q}%`);
    const [rows, total] = await ds.getRepository(MeterDefinitionEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data: rows.map((r) => MeterDefinitionSchema.parse(r)), total };
  }

  /** Soft-delete a meter (its historical events remain for audit). */
  static async deleteMeter(tenantId: string, meterId: string): Promise<{ deleted: boolean }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MeterDefinitionEntity);
    const meter = await repo.findOne({ where: { tenantId, meterId } });
    if (!meter) throw new AppError(MESSAGES.METER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.softRemove(meter);
    return { deleted: true };
  }

  /** Active meters for a tenant — the set a billing run iterates over. */
  static async listActiveMeters(tenantId: string): Promise<MeterDefinition[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds
      .getRepository(MeterDefinitionEntity)
      .find({ where: { tenantId, active: true }, order: { key: 'ASC' } });
    return rows.map((r) => MeterDefinitionSchema.parse(r));
  }
}
