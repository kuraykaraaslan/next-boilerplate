export const CHALLENGE_TTL_SECONDS = 120;
export const MAX_POLL_DURATION_SECONDS = 180;
export const POLL_INTERVAL_SECONDS = 2;

export const RATE_LIMIT_INITIATE_PER_MIN = 5;
export const RATE_LIMIT_INITIATE_PER_HOUR = 20;
export const RATE_LIMIT_BIND_PER_HOUR = 5;

export const TRANSACTION_REDIS_PREFIX = 'e_signature:txn:';

export const TRUST_LIST_CACHE_TTL_SECONDS = 24 * 60 * 60;
export const TRUST_LIST_REFRESH_CRON = '0 3 * * *'; // daily 03:00 UTC

export const DEFAULT_EU_LOTL_URL =
  'https://ec.europa.eu/tools/lotl/eu-lotl.xml';

export const CHALLENGE_DISPLAY_MAX_LENGTH = 40;
