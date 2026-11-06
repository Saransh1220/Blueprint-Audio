import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';

describe('saved cart repricing', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    localStorage.setItem(
      'waveyard.cart.v1',
      JSON.stringify([
        {
          id: 'item',
          spec: { id: 'beat' },
          license: {
            id: 'license',
            price: 1,
            displayPriceMoney: { amount_minor: 100, currency: 'USD' },
          },
        },
      ]),
    );
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });
  it('withholds the saved total until current backend offers arrive', () => {
    const cart = TestBed.inject(CartService);
    expect(cart.totalMoney()).toBeNull();
    cart.refresh();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/specs/beat'))
      .flush({
        id: 'beat',
        title: 'Beat',
        key: 'C',
        price: 10,
        licenses: [
          {
            id: 'license',
            name: 'Basic',
            type: 'Basic',
            price: 10,
            features: [],
            file_types: [],
            selected_price: {
              price_id: 'price',
              revision: 2,
              currency: 'USD',
              amount_minor: 1500,
              amount_major: 15,
              selection: 'exact',
              is_purchasable: true,
              available_currencies: ['USD'],
            },
          },
        ],
      });
    expect(cart.totalMoney()).toEqual({ currency: 'USD', amount_minor: 1500 });
    expect(cart.needsRefresh()).toBe(false);
  });
  it('does not reuse stale prices when refresh fails', () => {
    const cart = TestBed.inject(CartService);
    cart.refresh();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/specs/beat'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(cart.totalMoney()).toBeNull();
    expect(cart.needsRefresh()).toBe(true);
  });
});
