import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CartService } from '../../services';
import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  const removeItem = vi.fn();
  const clear = vi.fn();
  let items: ReturnType<typeof signal<any[]>>;

  beforeEach(() => {
    items = signal([{ id: '1' }]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CartService,
          useValue: {
            items,
            total: vi.fn(() => 100),
            removeItem,
            clear,
          },
        },
      ],
    });
  });

  it('removes items and exposes total', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const component = TestBed.runInInjectionContext(() => new CartComponent());

    expect(component.total).toBe(100);
    component.removeItem('1');
    expect(removeItem).toHaveBeenCalledWith('1');
    component.checkout();
    expect(logSpy).toHaveBeenCalled();
  });

  it('returns a single total when cart currencies match', () => {
    items.set([
      {
        id: '1',
        license: { displayPriceMoney: { amount_minor: 1200, currency: 'USD' } },
      },
      {
        id: '2',
        license: { displayPriceMoney: { amount_minor: 300, currency: 'USD' } },
      },
    ]);
    const component = TestBed.runInInjectionContext(() => new CartComponent());

    expect(component.hasMixedCurrencies).toBe(false);
    expect(component.totalMoney).toEqual({ amount_minor: 1500, currency: 'USD' });
  });

  it('detects mixed currencies and suppresses a misleading single total', () => {
    items.set([
      {
        id: '1',
        license: { displayPriceMoney: { amount_minor: 1200, currency: 'USD' } },
      },
      {
        id: '2',
        license: { displayPriceMoney: { amount_minor: 300, currency: 'INR' } },
      },
    ]);
    const component = TestBed.runInInjectionContext(() => new CartComponent());

    expect(component.hasMixedCurrencies).toBe(true);
    expect(component.totalMoney).toBeNull();
  });

  it('returns null when items do not have display money', () => {
    const component = TestBed.runInInjectionContext(() => new CartComponent());

    expect(component.hasMixedCurrencies).toBe(false);
    expect(component.totalMoney).toBeNull();
  });

  it('clears the cart and counts distinct producers', () => {
    items.set([
      { id: '1', spec: { producerId: 'p1' } },
      { id: '2', spec: { producerId: 'p1' } },
      { id: '3', spec: { producerId: 'p2' } },
      { id: '4', spec: {} },
    ]);
    const component = TestBed.runInInjectionContext(() => new CartComponent());
    expect(component.items()).toBe(items());
    expect(component.producerCount).toBe(2);
    component.clearCart();
    expect(clear).toHaveBeenCalled();
  });
});
