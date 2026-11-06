/** Currency codes come from API configuration; historical records retain their code. */
export type AppCurrency = string;

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
