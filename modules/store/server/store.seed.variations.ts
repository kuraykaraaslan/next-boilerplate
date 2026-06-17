import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { StoreProduct } from './entities/store_product.entity';
import { StoreVariationType } from './entities/store_variation_type.entity';
import { StoreVariationOption } from './entities/store_variation_option.entity';
import { StoreProductVariant } from './entities/store_product_variant.entity';
import { ramOpts, storageOpts } from './store.seed.data';

/**
 * Seed the laptop's RAM × Storage variation matrix (3×3 sellable variants) and
 * return the id of the first variant created (published as `refs.productVariantId`).
 */
export async function seedLaptopVariations(ctx: SeedContext, laptop: StoreProduct): Promise<string | undefined> {
  const { tenantId, foc } = ctx;
  const variationTypeRepo = ctx.repo<StoreVariationType>(StoreVariationType);
  const variationOptionRepo = ctx.repo<StoreVariationOption>(StoreVariationOption);
  const variantRepo = ctx.repo<StoreProductVariant>(StoreProductVariant);

  const ramType = await foc(variationTypeRepo,
    { tenantId, productId: laptop.productId, name: 'RAM' } as FindOptionsWhere<StoreVariationType>,
    { tenantId, productId: laptop.productId, name: 'RAM', displayType: 'BUTTON', sortOrder: 1 },
  );
  const storageType = await foc(variationTypeRepo,
    { tenantId, productId: laptop.productId, name: 'Storage' } as FindOptionsWhere<StoreVariationType>,
    { tenantId, productId: laptop.productId, name: 'Storage', displayType: 'BUTTON', sortOrder: 2 },
  );

  const mkOption = (typeId: string, o: { label: string; value: string }, sortOrder: number) =>
    foc(variationOptionRepo,
      { tenantId, variationTypeId: typeId, value: o.value } as FindOptionsWhere<StoreVariationOption>,
      { tenantId, variationTypeId: typeId, label: o.label, value: o.value, sortOrder },
    );
  const ramRows: StoreVariationOption[] = [];
  for (let i = 0; i < ramOpts.length; i++) ramRows.push(await mkOption(ramType.variationTypeId, ramOpts[i], i + 1));
  const storageRows: StoreVariationOption[] = [];
  for (let i = 0; i < storageOpts.length; i++) storageRows.push(await mkOption(storageType.variationTypeId, storageOpts[i], i + 1));

  let firstVariantId: string | undefined;
  let variantSort = 0;
  for (let r = 0; r < ramOpts.length; r++) {
    for (let s = 0; s < storageOpts.length; s++) {
      const sku = `TEST-LAPTOP-${ramOpts[r].value}-${storageOpts[s].value}`;
      const variant = await foc(variantRepo,
        { tenantId, productId: laptop.productId, sku } as FindOptionsWhere<StoreProductVariant>,
        {
          tenantId, productId: laptop.productId,
          optionIds: [ramRows[r].optionId, storageRows[s].optionId], sku,
          price: Math.round((1299.99 + ramOpts[r].delta + storageOpts[s].delta) * 100) / 100,
          stockQuantity: 5 + r * 3 + s, isActive: true, sortOrder: variantSort++,
        },
      );
      firstVariantId ??= variant.variantId;
    }
  }
  return firstVariantId;
}
