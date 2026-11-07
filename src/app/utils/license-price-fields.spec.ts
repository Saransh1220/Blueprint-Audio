import { FormBuilder } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import type { LicenseDto } from '../core/api/spec.requests';
import {
  buildLicensePriceFormGroup,
  extractLicensePricePayload,
  populateLicensePriceGroupFromDto,
  validatePriceInput,
} from './license-price-fields';

describe('license-price-fields', () => {
  const fb = new FormBuilder();

  describe('validatePriceInput', () => {
    it('requires a price value', () => {
      expect(validatePriceInput('')).toBe('Price is required');
      expect(validatePriceInput(null)).toBe('Price is required');
      expect(validatePriceInput('   ')).toBe('Price is required');
    });

    it('rejects invalid numbers and formatting', () => {
      expect(validatePriceInput('abc')).toBe('Enter a valid positive number');
      expect(validatePriceInput('19,99')).toBe('Enter a valid positive number');
      expect(validatePriceInput('1.2.3')).toBe('Enter a valid positive number');
      expect(validatePriceInput('-10')).toBe('Enter a valid positive number');
    });

    it('rejects zero or negative prices', () => {
      expect(validatePriceInput('0')).toBe('Price must be greater than 0');
      expect(validatePriceInput('0.00')).toBe('Price must be greater than 0');
    });

    it('accepts valid positive numbers', () => {
      expect(validatePriceInput('19.99')).toBeNull();
      expect(validatePriceInput('1499.00')).toBeNull();
      expect(validatePriceInput(25)).toBeNull();
    });
  });

  describe('buildLicensePriceFormGroup & extractLicensePricePayload in Create Mode', () => {
    it('builds group with initial prices and extracts payload', () => {
      const group = buildLicensePriceFormGroup(fb, 'USD', 'INR', {
        nativePrice: '19.99',
        secondaryPrice: '1659.00',
        sellNativeOnly: false,
      });

      expect(group.get('nativePrice')?.value).toBe('19.99');
      expect(group.get('secondaryPrice')?.value).toBe('1659.00');
      expect(group.get('sellNativeOnly')?.value).toBe(false);

      const payload = extractLicensePricePayload(group, 'USD', 'INR', false);
      expect(payload).toEqual([
        { currency: 'USD', amount_minor: 1999, is_active: true },
        { currency: 'INR', amount_minor: 165900, is_active: true },
      ]);
    });

    it('marks secondary price inactive when sellNativeOnly is true', () => {
      const group = buildLicensePriceFormGroup(fb, 'USD', 'INR', {
        nativePrice: '19.99',
        secondaryPrice: '1659.00',
        sellNativeOnly: true,
      });

      const payload = extractLicensePricePayload(group, 'USD', 'INR', false);
      expect(payload).toEqual([
        { currency: 'USD', amount_minor: 1999, is_active: true },
        { currency: 'INR', amount_minor: 165900, is_active: false },
      ]);
    });
  });

  describe('populateLicensePriceGroupFromDto & extractLicensePricePayload in Edit Mode', () => {
    const mockLicense: LicenseDto = {
      id: 'lic-1',
      spec_id: 'spec-1',
      type: 'Basic',
      name: 'Basic Lease',
      price: 19.99,
      features: ['MP3'],
      file_types: ['MP3'],
      created_at: '',
      updated_at: '',
      prices: [
        {
          id: 'sp-1',
          license_option_id: 'lic-1',
          currency: 'USD',
          amount_minor: 1999,
          amount_major: 19.99,
          source: 'owner',
          revision: 2,
          is_active: true,
        },
        {
          id: 'sp-2',
          license_option_id: 'lic-1',
          currency: 'INR',
          amount_minor: 165900,
          amount_major: 1659,
          source: 'owner',
          revision: 1,
          is_active: false,
        },
      ],
    };

    it('populates form from license prices and detects inactive secondary', () => {
      const group = buildLicensePriceFormGroup(fb, 'USD', 'INR');
      populateLicensePriceGroupFromDto(group, mockLicense, 'USD', 'INR');

      expect(group.get('nativePrice')?.value).toBe('19.99');
      expect(group.get('secondaryPrice')?.value).toBe('1659.00');
      expect(group.get('sellNativeOnly')?.value).toBe(true);
      expect(group.get('nativeRevision')?.value).toBe(2);
      expect(group.get('secondaryRevision')?.value).toBe(1);
    });

    it('sends NO price patches for metadata-only edit (prices unchanged)', () => {
      const group = buildLicensePriceFormGroup(fb, 'USD', 'INR');
      populateLicensePriceGroupFromDto(group, mockLicense, 'USD', 'INR');

      const patches = extractLicensePricePayload(group, 'USD', 'INR', true);
      expect(patches).toEqual([]);
    });

    it('sends only changed native price with revision', () => {
      const group = buildLicensePriceFormGroup(fb, 'USD', 'INR');
      populateLicensePriceGroupFromDto(group, mockLicense, 'USD', 'INR');

      group.patchValue({ nativePrice: '24.99' });

      const patches = extractLicensePricePayload(group, 'USD', 'INR', true);
      expect(patches).toEqual([
        { currency: 'USD', amount_minor: 2499, is_active: true, revision: 2 },
      ]);
    });

    it('sends patch when sellNativeOnly is toggled', () => {
      const group = buildLicensePriceFormGroup(fb, 'USD', 'INR');
      populateLicensePriceGroupFromDto(group, mockLicense, 'USD', 'INR');

      group.patchValue({ sellNativeOnly: false }); // was true, now false -> active

      const patches = extractLicensePricePayload(group, 'USD', 'INR', true);
      expect(patches).toEqual([
        { currency: 'INR', amount_minor: 165900, is_active: true, revision: 1 },
      ]);
    });

    it('supports legacy specs without prices array by falling back to scalar price', () => {
      const legacyLicense: LicenseDto = {
        id: 'lic-legacy',
        spec_id: 'spec-legacy',
        type: 'Basic',
        name: 'Basic Lease',
        price: 15.0,
        features: [],
        file_types: [],
        created_at: '',
        updated_at: '',
      };

      const group = buildLicensePriceFormGroup(fb, 'USD', 'INR');
      populateLicensePriceGroupFromDto(group, legacyLicense, 'USD', 'INR');

      expect(group.get('nativePrice')?.value).toBe('15.00');
      expect(group.get('secondaryPrice')?.value).toBe('');
      expect(group.get('sellNativeOnly')?.value).toBe(false);
    });
  });
});
