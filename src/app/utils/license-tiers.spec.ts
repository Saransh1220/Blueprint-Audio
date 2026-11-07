import type { LicenseOption } from '../models';
import { isExclusiveLicense, licenseTiers, TIER_ICON, TIER_LABEL } from './license-tiers';

const lic = (name: string, type = 'Basic') => ({ name, type }) as LicenseOption;
const names = (...list: string[]) => list.map((name) => lic(name));

describe('license tiers', () => {
  it('flags nothing for zero or one license', () => {
    expect(licenseTiers([])).toEqual([]);
    expect(licenseTiers(names('Solo'))).toEqual(['standard']);
  });

  it('flags the second license as popular when there are two', () => {
    expect(licenseTiers(names('A', 'B'))).toEqual(['standard', 'popular']);
  });

  it('flags popular and highest from three licenses up', () => {
    expect(licenseTiers(names('A', 'B', 'C'))).toEqual(['standard', 'popular', 'highest']);
    expect(licenseTiers(names('Basic', 'Premium', 'Trackout', 'Unlimited'))).toEqual([
      'standard',
      'popular',
      'standard',
      'highest',
    ]);
    expect(licenseTiers(names('A', 'B', 'C', 'D', 'E'))).toEqual([
      'standard',
      'popular',
      'standard',
      'standard',
      'highest',
    ]);
  });

  it('prefers the Premium license for popular wherever it sits', () => {
    expect(licenseTiers(names('Premium', 'B', 'C', 'D'))).toEqual([
      'popular',
      'standard',
      'standard',
      'highest',
    ]);
    expect(licenseTiers([lic('Gold', 'Premium'), lic('B'), lic('C')])[0]).toBe('popular');
  });

  it('never makes the last license popular just for being called Premium', () => {
    expect(licenseTiers(names('A', 'B', 'Premium'))).toEqual(['standard', 'popular', 'highest']);
  });

  it('always makes an exclusive license the highest tier', () => {
    expect(licenseTiers(names('Basic', 'Premium', 'Exclusive', 'Extra'))).toEqual([
      'standard',
      'popular',
      'highest',
      'standard',
    ]);
    expect(licenseTiers(names('Basic', 'Exclusive'))).toEqual(['standard', 'highest']);
    expect(licenseTiers([lic('Gold', 'Exclusive'), lic('B')])[0]).toBe('highest');
  });

  it('treats an exclusive Premium as the highest tier, not the popular one', () => {
    expect(licenseTiers(names('A', 'Premium Exclusive'))).toEqual(['standard', 'highest']);
  });

  it('detects exclusive licenses by name or type', () => {
    expect(isExclusiveLicense(lic('Exclusive Lease'))).toBe(true);
    expect(isExclusiveLicense(lic('Gold', 'Exclusive'))).toBe(true);
    expect(isExclusiveLicense(lic('Gold'))).toBe(false);
  });

  it('labels and icons the flagged tiers only', () => {
    expect(TIER_LABEL.popular).toBe('Most popular');
    expect(TIER_LABEL.highest).toBe('Highest tier');
    expect(TIER_LABEL.standard).toBe('');
    expect(TIER_ICON.popular).toBe('fa-star');
    expect(TIER_ICON.highest).toBe('fa-crown');
    expect(TIER_ICON.standard).toBe('');
  });
});
