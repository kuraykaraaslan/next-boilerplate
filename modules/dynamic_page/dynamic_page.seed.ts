import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { DynamicPage } from './entities/dynamic_page.entity';
import { DynamicPageBlock } from './entities/dynamic_page_block.entity';
import { DynamicPageTranslation } from './entities/dynamic_page_translation.entity';
import { DynamicCollection } from './entities/dynamic_collection.entity';
import { DynamicCollectionItem } from './entities/dynamic_collection_item.entity';
import { baseBlockDefs } from './dynamic_page.seed.blocks';
import { dataBlockDefs } from './dynamic_page.seed.data-blocks';
import { buildPageSeedRows } from './dynamic_page.seed.pages';
import { buildTranslationSeedRows } from './dynamic_page.seed.translations';
import { postsCollectionDef, leadsCollectionDef, samplePosts } from './dynamic_page.seed.collections';

/**
 * Demo-data seed for the `dynamic_page` module (CMS-style page builder).
 *
 * Follows the house rules from `modules/store/store.seed.ts`:
 *  - Everything goes through `ctx.foc(repo, where, create)` keyed on the
 *    entity's @Unique natural key so re-runs reuse rows instead of duplicating.
 *  - Only *valid* enum values: DynamicPageStatus is DRAFT / PUBLISHED / ARCHIVED.
 *  - jsonb columns (`sections`, `metadata`, `schema`, `defaultProps`, …) are
 *    real objects/arrays shaped like the zod schemas in `dynamic_page.types.ts`.
 *  - All entities carry a `tenantId` column → tenant-scoped `ctx.repo`.
 *
 * The static block/page/translation/collection data lives in the sibling
 * `dynamic_page.seed.*` modules; this orchestrator just upserts it.
 */
export async function seedDynamicPage(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // ── Block library ──────────────────────────────────────────────────────────
  const blocks: Record<string, DynamicPageBlock> = {};
  for (const def of baseBlockDefs) {
    blocks[def.type] = await foc(ctx.repo<DynamicPageBlock>(DynamicPageBlock),
      { tenantId, type: def.type } as FindOptionsWhere<DynamicPageBlock>,
      { tenantId, ...def },
    );
  }

  // ── Pages (published home / about, draft promo, archived legacy) ────────────
  const pages: Record<string, DynamicPage> = {};
  for (const row of buildPageSeedRows(tenantId)) {
    pages[row.slug] = await foc(ctx.repo<DynamicPage>(DynamicPage),
      { tenantId, slug: row.slug } as FindOptionsWhere<DynamicPage>,
      row.create,
    );
  }
  const home = pages['home'];
  const about = pages['about'];

  // ── Translations (per-page localized content) ───────────────────────────────
  for (const def of buildTranslationSeedRows(home, about)) {
    await foc(ctx.repo<DynamicPageTranslation>(DynamicPageTranslation),
      { tenantId, dynamicPageId: def.dynamicPageId, lang: def.lang } as FindOptionsWhere<DynamicPageTranslation>,
      { tenantId, ...def },
    );
  }

  // ── Collections (Wix-style CMS data tables) ────────────────────────────────
  const postsCollection = await foc(ctx.repo<DynamicCollection>(DynamicCollection),
    { tenantId, slug: 'posts' } as FindOptionsWhere<DynamicCollection>,
    { tenantId, ...postsCollectionDef },
  );
  const leadsCollection = await foc(ctx.repo<DynamicCollection>(DynamicCollection),
    { tenantId, slug: 'leads' } as FindOptionsWhere<DynamicCollection>,
    { tenantId, ...leadsCollectionDef },
  );

  // Sample posts — only seed if the collection has no items yet (idempotent).
  const itemRepo = ctx.repo<DynamicCollectionItem>(DynamicCollectionItem);
  const existingCount = await itemRepo.count({ where: { tenantId, collectionId: postsCollection.collectionId } });
  if (existingCount === 0) {
    for (const post of samplePosts) {
      await itemRepo.save(itemRepo.create({ tenantId, collectionId: postsCollection.collectionId, data: post }));
    }
  }

  // ── Data-driven block definitions (blog-list, lead-form) ─────────────────────
  for (const def of dataBlockDefs) {
    await foc(ctx.repo<DynamicPageBlock>(DynamicPageBlock),
      { tenantId, type: def.type } as FindOptionsWhere<DynamicPageBlock>,
      { tenantId, ...def },
    );
  }

  // ── Publish references other modules may consume ────────────────────────────
  refs.dynamicPageId = home.dynamicPageId;
  refs.dynamicPageBlockId = blocks['hero']?.blockId;
  refs.dynamicCollectionId = postsCollection.collectionId;

  ctx.log(
    `dynamic_page: 5 blocks, 4 pages, 3 translations, 2 collections (posts/${postsCollection.collectionId}, leads/${leadsCollection.collectionId}), 3 sample posts for ${tenantId}`,
  );

  // touch unused bindings
  void leadsCollection;
}
