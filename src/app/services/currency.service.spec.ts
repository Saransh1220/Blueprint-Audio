import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { formatMoneyValue, minorToMajor, normalizeCurrencyCode } from '../models/money';
import { CurrencyConfigurationService } from './currency-configuration.service';
import { CurrencyService } from './currency.service';

describe('shared money formatting', () => {
  it('uses integer minor units, including zero, negatives and three-decimal currencies', () => {
    expect(formatMoneyValue({ amount_minor: 0, currency: 'USD' }, 99)).toBe('$0');
    expect(formatMoneyValue({ amount_minor: -125, currency: 'USD' })).toBe('-$1.25');
    expect(formatMoneyValue({ amount_minor: 1234, currency: 'KWD' })).toContain('1.234');
    expect(minorToMajor(1234, 'JPY')).toBe(1234);
    expect(minorToMajor(1234, 'KWD')).toBe(1.234);
    expect(() => minorToMajor(1234, 'INVALID')).toThrow();
  });

  it('rejects invalid or unsafe values without inventing a currency', () => {
    expect(formatMoneyValue({ amount_minor: 1.5, currency: 'USD' })).toBe('—');
    expect(formatMoneyValue({ amount_minor: Number.MAX_SAFE_INTEGER + 1, currency: 'USD' })).toBe(
      '—',
    );
    expect(formatMoneyValue({ amount_minor: 10, currency: 'NOPE' })).toBe('—');
    expect(formatMoneyValue({ amount_minor: 10 } as any)).toBe('—');
    expect(formatMoneyValue(null, Infinity)).toBe('—');
    expect(normalizeCurrencyCode(null)).toBeNull();
    expect(normalizeCurrencyCode(' usd ')).toBe('USD');
    expect(formatMoneyValue({ amount_minor: 1250, currency: 'EUR' })).toContain('12.50');
  });

  it('honors API scale and locale without adding a new frontend currency branch', () => {
    const currencies = signal([
      { code: 'JPY', symbol: '¥', minor_unit_scale: 1, locale: 'ja-JP', gateway: null },
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: CurrencyConfigurationService, useValue: { currencies } }],
    });
    const service = TestBed.inject(CurrencyService);
    expect(service.formatMinorMoney(1234, 'jpy')).toBe(
      new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        maximumFractionDigits: 0,
      }).format(1234),
    );
    expect(service.normalizeCurrency('EUR')).toBe('EUR');
    expect(service.normalizeCurrency()).toBe('INR');
    expect(service.normalizeCurrency('bad-code')).toBe('bad-code');
    expect(service.formatMoney()).toContain('0');
    expect(service.formatCompactMoney(12000, 'JPY')).toBe(
      new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(12000),
    );
  });
});
