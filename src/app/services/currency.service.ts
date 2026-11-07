import { Injectable, inject } from '@angular/core';
import {
  type AppCurrency,
  type Money,
  type MoneyFormatOptions,
  DEFAULT_LEGACY_CURRENCY,
  formatMoneyValue,
  normalizeCurrencyCode,
} from '../models/money';
import { CurrencyConfigurationService } from './currency-configuration.service';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly configuration = inject(CurrencyConfigurationService);

  formatMoney(
    money?: Money | null,
    fallbackAmount?: number,
    fallbackCurrency: AppCurrency = DEFAULT_LEGACY_CURRENCY,
    options: MoneyFormatOptions = {},
  ) {
    return formatMoneyValue(
      money,
      fallbackAmount ?? 0,
      fallbackCurrency,
      this.configuration.currencies(),
      options,
    );
  }

  formatMinorMoney(amountMinor: number, currency?: string) {
    const normalizedCurrency = this.normalizeCurrency(currency);
    return this.formatMoney({ amount_minor: amountMinor, currency: normalizedCurrency });
  }

  formatCompactMoney(amount: number, currency: AppCurrency): string {
    return formatMoneyValue(null, amount, currency, this.configuration.currencies(), {
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
  }

  reportingCurrency(): AppCurrency {
    return this.configuration.currencies()[0]?.code ?? DEFAULT_LEGACY_CURRENCY;
  }

  normalizeCurrency(currency?: string): AppCurrency {
    // Missing currency belongs only to legacy database records without explicit currency fields.
    // Non-empty codes are preserved or rejected by the formatter, never silently relabeled.
    if (!currency?.trim()) return DEFAULT_LEGACY_CURRENCY;
    return normalizeCurrencyCode(currency) ?? currency;
  }
}
