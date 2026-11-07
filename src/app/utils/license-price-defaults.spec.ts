import { describe, expect, it } from 'vitest';
import {
  LICENSE_TIER_DEFAULTS,
  getDefaultPrice,
} from './license-price-defaults';

describe('license-price-defaults', () => {
  it('defines 4 default tiers with metadata', () => {
    expect(LICENSE_TIER_DEFAULTS).toHaveLength(4);
    const types = LICENSE_TIER_DEFAULTS.map((t) => t.type);
    expect(types).toEqual(['Basic', 'Premium', 'Trackout', 'Unlimited']);
  });

  it('provides commercial USD defaults', () => {
    expect(getDefaultPrice('Basic', 'USD')).toBe(14.99);
    expect(getDefaultPrice('Premium', 'USD')).toBe(24.99);
    expect(getDefaultPrice('Trackout', 'USD')).toBe(49.99);
    expect(getDefaultPrice('Unlimited', 'USD')).toBe(99.99);
  });

  it('provides INR defaults', () => {
    expect(getDefaultPrice('Basic', 'INR')).toBe(14.99);
    expect(getDefaultPrice('Premium', 'INR')).toBe(24.99);
    expect(getDefaultPrice('Trackout', 'INR')).toBe(49.99);
    expect(getDefaultPrice('Unlimited', 'INR')).toBe(99.99);
  });

  it('handles case-insensitivity and whitespace', () => {
    expect(getDefaultPrice('basic ', 'usd')).toBe(14.99);
    expect(getDefaultPrice('TRACKOUT', 'Usd')).toBe(49.99);
  });

  it('returns null for unknown tiers or currencies', () => {
    expect(getDefaultPrice('Custom', 'USD')).toBeNull();
    expect(getDefaultPrice('Basic', 'EUR')).toBeNull();
  });
});
