export const EXCHANGE_RATE_MESSAGES = {
  FETCH_FAILED: 'Failed to fetch exchange rates from TCMB',
  PARSE_FAILED: 'Failed to parse TCMB exchange rate response',
  UNSUPPORTED_PAIR: 'Unsupported currency pair (only USD <-> TRY is supported)',
  RATE_UNAVAILABLE: 'Exchange rate is currently unavailable',
  INVALID_AMOUNT: 'Amount must be a finite number >= 0',
} as const
