import { Injectable } from '@angular/core';
import { minorToMajor, type AppCurrency, type Money } from '../models/money';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  formatMoney(
    money?: Money | null,
    fallbackAmount?: number,
    fallbackCurrency: AppCurrency = 'INR',
  ) {
    const currency = money?.currency ?? fallbackCurrency;
    const amount = money ? minorToMajor(money.amount_minor, currency) : (fallbackAmount ?? 0);
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  }

  formatMinorMoney(amountMinor: number, currency?: string) {
    const normalizedCurrency = this.normalizeCurrency(currency);
    const amount = minorToMajor(amountMinor, normalizedCurrency);
    const hasFraction = amountMinor % 100 !== 0;
    return new Intl.NumberFormat(normalizedCurrency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: hasFraction ? 2 : 0,
    }).format(amount);
  }

  normalizeCurrency(currency?: string): AppCurrency {
    return currency?.toUpperCase() === 'USD' ? 'USD' : 'INR';
  }
}
