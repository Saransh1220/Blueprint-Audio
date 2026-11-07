import { TestBed } from '@angular/core/testing';
import { MoneyPipe } from './money.pipe';
import { CurrencyService } from '../../services/currency.service';
import type { SelectedPriceOffer } from '../../models/money';

describe('MoneyPipe offer presentation', () => {
  const formatMoney = vi.fn(() => '$0');
  beforeEach(() => {
    formatMoney.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: CurrencyService, useValue: { formatMoney } }],
    });
  });
  const offer: SelectedPriceOffer = {
    currency: 'USD',
    amount_minor: 0,
    amount_major: 0,
    revision: 1,
    selection: 'exact',
    is_purchasable: true,
    available_currencies: ['USD'],
  };
  it('keeps stored zero distinct from unavailable', () => {
    const pipe = TestBed.runInInjectionContext(() => new MoneyPipe());
    expect(
      pipe.transform(null, 999, { ...offer, selection: 'unavailable', is_purchasable: false }),
    ).toBe('Unavailable');
    expect(formatMoney).not.toHaveBeenCalled();
    expect(pipe.transform(null, 999, offer)).toBe('$0');
    expect(formatMoney).toHaveBeenCalledWith({ currency: 'USD', amount_minor: 0 });
  });
});
