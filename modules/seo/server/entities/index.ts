// Entity-only barrel: pure TypeORM classes, no service imports — so the central
// `db.entities` aggregator can import these without pulling in @kuraykaraaslan/seo services
// (which depend back on @kuraykaraaslan/db, which would create an import cycle).
export { SeoMeta } from './seo_meta.entity';
