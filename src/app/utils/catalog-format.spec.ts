import {
  formatCatalogDuration,
  formatCatalogFileSize,
  formatCatalogPrice,
  splitAccentTitle,
} from './catalog-format';

describe('catalog-format', () => {
  it('splits a title around its accent, case-insensitively', () => {
    expect(splitAccentTitle('Violet Hour', 'hour')).toEqual({
      before: 'Violet ',
      accent: 'Hour',
      after: '',
    });
    expect(splitAccentTitle('Dark Loop Pack', 'loop')).toEqual({
      before: 'Dark ',
      accent: 'Loop',
      after: ' Pack',
    });
  });

  it('returns the whole title when accent is missing', () => {
    expect(splitAccentTitle('Violet Hour', 'xyz')).toEqual({
      before: 'Violet Hour',
      accent: '',
      after: '',
    });
  });

  it('formats prices', () => {
    expect(formatCatalogPrice({ amount_minor: 0, currency: 'USD' })).toBe('Free');
    expect(formatCatalogPrice({ amount_minor: 1500, currency: 'USD' })).toBe('$15');
    expect(formatCatalogPrice({ amount_minor: 1999, currency: 'USD' })).toBe('$19.99');
  });

  it('formats durations', () => {
    expect(formatCatalogDuration(8)).toBe('0:08');
    expect(formatCatalogDuration(125)).toBe('2:05');
  });

  it('formats file sizes in MB and GB', () => {
    expect(formatCatalogFileSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatCatalogFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    expect(formatCatalogFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });
});
