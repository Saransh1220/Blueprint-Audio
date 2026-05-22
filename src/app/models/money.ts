export type AppCurrency = 'INR' | 'USD';

export interface Money {
  amount_minor: number;
  currency: AppCurrency;
}

const minorUnitScale: Record<AppCurrency, number> = {
  INR: 100,
  USD: 100,
};

export function minorToMajor(amountMinor: number, currency: AppCurrency): number {
  return amountMinor / minorUnitScale[currency];
}
