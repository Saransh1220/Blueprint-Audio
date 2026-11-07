/** Currency codes come from API configuration; historical records retain their code. */
export type AppCurrency = string;

export type PriceSelectionStatus = 'exact' | 'native_fallback' | 'unavailable';

export interface StoredPrice {
  id: string;
  license_option_id: string;
  currency: AppCurrency;
  amount_minor: number;
  amount_major: number;
  source: string;
  revision: number;
  is_active: boolean;
}

export interface SelectedPriceOffer {
  price_id?: string;
  revision: number;
  amount_minor: number;
  amount_major: number;
  currency: AppCurrency;
  selection: PriceSelectionStatus;
  fallback_reason?: string;
  is_purchasable: boolean;
  available_currencies: string[];
}

export interface Money {
  amount_minor: number;
  currency: AppCurrency;
}

export interface CurrencyDefinition {
  code: string;
  symbol: string;
  minor_unit_scale: number;
  locale: string;
  gateway: string | null;
}

export interface MoneyFormatOptions extends Intl.NumberFormatOptions {
  trailingZeros?: boolean;
}

/** Compatibility metadata used when an older/offline API has no configuration endpoint. */
export const DEFAULT_LEGACY_CURRENCY: AppCurrency = 'INR';

export const FALLBACK_CURRENCIES: readonly CurrencyDefinition[] = Object.freeze([
  Object.freeze({
    code: 'INR',
    symbol: '₹',
    minor_unit_scale: 100,
    locale: 'en-IN',
    gateway: null,
  }),
  Object.freeze({
    code: 'USD',
    symbol: '$',
    minor_unit_scale: 100,
    locale: 'en-US',
    gateway: null,
  }),
]);

export function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export function currencyScale(currency: string, configuredScale?: number): number {
  if (configuredScale !== undefined) return configuredScale;
  const code = normalizeCurrencyCode(currency);
  if (!code) throw new RangeError('Invalid currency code');
  const digits = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: code,
  }).resolvedOptions().maximumFractionDigits;
  return 10 ** (digits ?? 2);
}

export function minorToMajor(amountMinor: number, currency: AppCurrency, scale?: number): number {
  return amountMinor / currencyScale(currency, scale);
}

export const MAX_AMOUNT_MINOR = 100_000_000;

/**
 * Parses a user input decimal amount into integer minor units using string manipulation
 * to prevent floating point inaccuracies (e.g. 19.99 * 100 = 1998.9999999999998).
 * Returns NaN for invalid strings, negative numbers, multiple dots, commas, non-numeric chars,
 * or decimals exceeding scale precision.
 */
export function parseMajorToMinor(
  text: string | number | null | undefined,
  scale = 100,
): number {
  if (text === null || text === undefined) return NaN;
  const str = String(text).trim();
  if (!str) return NaN;

  if (!/^\d+(\.\d+)?$/.test(str)) {
    return NaN;
  }

  const maxDecimals = Math.max(0, Math.round(Math.log10(scale)));
  const parts = str.split('.');
  const wholePart = parts[0];
  const fracPart = parts[1] || '';

  if (fracPart.length > maxDecimals) {
    return NaN;
  }

  const paddedFrac = fracPart.padEnd(maxDecimals, '0');
  const combinedStr = `${wholePart}${paddedFrac}`;
  const minor = Number(combinedStr);

  if (!Number.isSafeInteger(minor) || minor < 0 || minor > MAX_AMOUNT_MINOR) {
    return NaN;
  }

  return minor;
}

/**
 * Formats an integer minor amount into a major decimal string without floating point inaccuracies.
 */
export function minorToMajorString(minor: number, scale = 100): string {
  if (!Number.isSafeInteger(minor) || minor < 0) return '0';
  const maxDecimals = Math.max(0, Math.round(Math.log10(scale)));
  if (maxDecimals === 0) {
    return String(minor);
  }

  const s = String(minor).padStart(maxDecimals + 1, '0');
  const splitIdx = s.length - maxDecimals;
  const whole = s.slice(0, splitIdx);
  const frac = s.slice(splitIdx);
  return `${whole}.${frac}`;
}

/** Shared by injectable formatters and framework-independent view helpers. */
export function formatMoneyValue(
  money?: Money | null,
  fallbackAmount = 0,
  fallbackCurrency = 'INR',
  currencies: readonly CurrencyDefinition[] = FALLBACK_CURRENCIES,
  options: MoneyFormatOptions = {},
): string {
  const code = normalizeCurrencyCode(money ? money.currency : fallbackCurrency);
  if (!code || (money && !Number.isSafeInteger(money.amount_minor))) return '—';
  const definition = currencies.find((item) => item.code === code);
  const scale = currencyScale(code, definition?.minor_unit_scale);
  const amount = money ? money.amount_minor / scale : fallbackAmount;
  if (!Number.isFinite(amount)) return '—';
  const digits = Math.log10(scale);
  const { trailingZeros = false, ...intlOptions } = options;
  const fractions = trailingZeros || !Number.isInteger(amount) ? digits : 0;
  return new Intl.NumberFormat(definition?.locale ?? 'en', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: fractions,
    maximumFractionDigits: fractions,
    ...intlOptions,
  }).format(amount);
}
