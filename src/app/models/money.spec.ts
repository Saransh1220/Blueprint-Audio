import { describe, expect, it } from 'vitest';
import {
  currencyScale,
  formatMoneyValue,
  MAX_AMOUNT_MINOR,
  minorToMajor,
  minorToMajorString,
  normalizeCurrencyCode,
  parseMajorToMinor,
} from './money';

describe('money model utilities', () => {
  describe('normalizeCurrencyCode', () => {
    it('normalizes valid 3-letter codes', () => {
      expect(normalizeCurrencyCode('usd')).toBe('USD');
      expect(normalizeCurrencyCode('  inr ')).toBe('INR');
      expect(normalizeCurrencyCode('EUR')).toBe('EUR');
    });

    it('returns null for invalid inputs', () => {
      expect(normalizeCurrencyCode('')).toBeNull();
      expect(normalizeCurrencyCode('US')).toBeNull();
      expect(normalizeCurrencyCode('USDD')).toBeNull();
      expect(normalizeCurrencyCode(123)).toBeNull();
      expect(normalizeCurrencyCode(null)).toBeNull();
    });
  });

  describe('currencyScale', () => {
    it('returns configured scale when provided', () => {
      expect(currencyScale('USD', 100)).toBe(100);
      expect(currencyScale('JPY', 1)).toBe(1);
    });

    it('derives scale from currency code when scale omitted', () => {
      expect(currencyScale('USD')).toBe(100);
      expect(currencyScale('INR')).toBe(100);
      expect(currencyScale('JPY')).toBe(1);
    });

    it('throws RangeError for invalid currency code', () => {
      expect(() => currencyScale('INVALID')).toThrow(RangeError);
    });
  });

  describe('minorToMajor', () => {
    it('converts minor units to major numbers', () => {
      expect(minorToMajor(1999, 'USD')).toBe(19.99);
      expect(minorToMajor(100, 'INR')).toBe(1);
      expect(minorToMajor(500, 'JPY', 1)).toBe(500);
    });
  });

  describe('parseMajorToMinor', () => {
    it('parses valid major decimal strings into minor integers', () => {
      expect(parseMajorToMinor('19.99', 100)).toBe(1999);
      expect(parseMajorToMinor('20', 100)).toBe(2000);
      expect(parseMajorToMinor('0.5', 100)).toBe(50);
      expect(parseMajorToMinor('0.01', 100)).toBe(1);
      expect(parseMajorToMinor('0', 100)).toBe(0);
      expect(parseMajorToMinor(14.99, 100)).toBe(1499);
      expect(parseMajorToMinor(' 34.99 ', 100)).toBe(3499);
    });

    it('avoids floating point multiplication bugs (0.1, 0.2, 19.99)', () => {
      // 0.1 * 100 in float can produce precision artifacts
      expect(parseMajorToMinor('0.1', 100)).toBe(10);
      expect(parseMajorToMinor('0.2', 100)).toBe(20);
      expect(parseMajorToMinor('0.29', 100)).toBe(29);
      expect(parseMajorToMinor('19.99', 100)).toBe(1999);
    });

    it('handles custom scale values', () => {
      expect(parseMajorToMinor('1500', 1)).toBe(1500);
      expect(parseMajorToMinor('1.234', 1000)).toBe(1234);
      expect(parseMajorToMinor('0.005', 1000)).toBe(5);
    });

    it('rejects fractions exceeding scale precision', () => {
      expect(parseMajorToMinor('19.999', 100)).toBeNaN();
      expect(parseMajorToMinor('1500.5', 1)).toBeNaN();
      expect(parseMajorToMinor('0.0001', 1000)).toBeNaN();
    });

    it('rejects invalid formatting, negative values, and separators', () => {
      expect(parseMajorToMinor('-19.99', 100)).toBeNaN();
      expect(parseMajorToMinor('19,99', 100)).toBeNaN();
      expect(parseMajorToMinor('1,000.00', 100)).toBeNaN();
      expect(parseMajorToMinor('1.2.3', 100)).toBeNaN();
      expect(parseMajorToMinor('1e3', 100)).toBeNaN();
      expect(parseMajorToMinor('abc', 100)).toBeNaN();
      expect(parseMajorToMinor('$19.99', 100)).toBeNaN();
      expect(parseMajorToMinor('', 100)).toBeNaN();
      expect(parseMajorToMinor(null, 100)).toBeNaN();
      expect(parseMajorToMinor(undefined, 100)).toBeNaN();
    });

    it('rejects amounts exceeding MAX_AMOUNT_MINOR', () => {
      expect(parseMajorToMinor('1000000.01', 100)).toBeNaN();
      expect(parseMajorToMinor('1000000.00', 100)).toBe(MAX_AMOUNT_MINOR);
    });
  });

  describe('minorToMajorString', () => {
    it('formats minor integers into decimal strings', () => {
      expect(minorToMajorString(1999, 100)).toBe('19.99');
      expect(minorToMajorString(2000, 100)).toBe('20.00');
      expect(minorToMajorString(5, 100)).toBe('0.05');
      expect(minorToMajorString(0, 100)).toBe('0.00');
      expect(minorToMajorString(149900, 100)).toBe('1499.00');
    });

    it('handles scale 1 (zero decimals)', () => {
      expect(minorToMajorString(1500, 1)).toBe('1500');
      expect(minorToMajorString(0, 1)).toBe('0');
    });

    it('handles scale 1000 (3 decimals)', () => {
      expect(minorToMajorString(1234, 1000)).toBe('1.234');
      expect(minorToMajorString(5, 1000)).toBe('0.005');
    });

    it('handles invalid or negative minor values safely', () => {
      expect(minorToMajorString(-1, 100)).toBe('0');
      expect(minorToMajorString(NaN, 100)).toBe('0');
    });
  });

  describe('formatMoneyValue', () => {
    it('formats money objects using Intl currency formatting', () => {
      expect(formatMoneyValue({ amount_minor: 1999, currency: 'USD' })).toBe('$19.99');
      expect(formatMoneyValue({ amount_minor: 10000, currency: 'INR' }, 0, 'INR')).toContain('100');
    });

    it('returns dash on invalid money input', () => {
      expect(formatMoneyValue({ amount_minor: NaN, currency: 'USD' })).toBe('—');
      expect(formatMoneyValue(null, NaN, 'USD')).toBe('—');
    });
  });
});
