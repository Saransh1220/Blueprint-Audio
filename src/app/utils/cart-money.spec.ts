import { summarizeCartMoney } from './cart-money';

describe('cart monetary boundary', () => {
  it('sums actual minor-unit money rather than unrelated scalar prices', () => {
    expect(
      summarizeCartMoney([
        { license: { displayPriceMoney: { currency: 'USD', amount_minor: 1499 } } },
        { license: { displayPriceMoney: { currency: 'USD', amount_minor: 0 } } },
      ]).totalMoney,
    ).toEqual({ currency: 'USD', amount_minor: 1499 });
  });
  it('does not turn an unavailable offer into a free item', () => {
    expect(
      summarizeCartMoney([
        {
          license: {
            selectedPrice: {
              currency: 'USD',
              amount_minor: 0,
              amount_major: 0,
              revision: 0,
              selection: 'unavailable',
              is_purchasable: false,
              available_currencies: [],
            },
          },
        },
      ]).totalMoney,
    ).toBeNull();
  });
  it('rejects unsafe sums, missing money and mixed units', () => {
    expect(
      summarizeCartMoney([
        {
          license: {
            displayPriceMoney: { currency: 'USD', amount_minor: Number.MAX_SAFE_INTEGER },
          },
        },
        { license: { displayPriceMoney: { currency: 'USD', amount_minor: 1 } } },
      ]).totalMoney,
    ).toBeNull();
    expect(summarizeCartMoney([{ license: {} }]).totalMoney).toBeNull();
    expect(
      summarizeCartMoney([
        { license: { displayPriceMoney: { currency: 'INR', amount_minor: 100 } } },
        { license: { displayPriceMoney: { currency: 'USD', amount_minor: 100 } } },
      ]).hasMixedCurrencies,
    ).toBe(true);
  });
});
