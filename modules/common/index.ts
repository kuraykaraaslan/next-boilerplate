/**
 * `@/modules/common` barrel — shared, dependency-free foundation primitives.
 *
 * The deep path `@/modules/common/app-error` remains valid and unchanged; this
 * barrel simply re-exports it alongside the locale/country/currency/timezone/
 * money/pagination/log-context primitives.
 */
export * from './app-error';
export * from './common.locale';
export * from './common.country';
export * from './common.currency';
export * from './common.timezone';
export * from './common.money';
export * from './common.pagination';
export * from './common.log-context';
