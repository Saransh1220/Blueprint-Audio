import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { basket } from '@lucasmarkes/hairline';
import { CartService } from '../../services';
import { CartComponent } from './cart.component';

const basketFigure = vi.hoisted(() => ({ update: vi.fn(), destroy: vi.fn() }));
vi.mock('@lucasmarkes/hairline', () => ({ basket: vi.fn(() => basketFigure) }));

describe('CartComponent', () => {
  const removeItem = vi.fn();
  const clear = vi.fn();
  let items: ReturnType<typeof signal<any[]>>;

  beforeEach(() => {
    items = signal([{ id: '1' }]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
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

  describe('the page', () => {
    const render = async () => {
      const fixture = TestBed.createComponent(CartComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture;
    };
    const link = (el: HTMLElement, text: string) =>
      Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
        a.textContent?.includes(text),
      );

    it('draws an empty cart as a basket, a heading and one way forward', async () => {
      items.set([]);
      const fixture = await render();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('.cart-page')?.classList.contains('is-empty')).toBe(true);
      expect(el.querySelector('app-cart-empty app-hairline-basket .figure')).toBeTruthy();
      await vi.waitFor(() => expect(basket).toHaveBeenCalledTimes(1));
      expect(el.querySelector('h1')?.textContent).toContain('Your cart is empty');
      expect(link(el, 'Explore the catalog')?.getAttribute('href')).toBe('/explore');
    });

    it('offers the three catalogues as quiet links', async () => {
      items.set([]);
      const el = (await render()).nativeElement as HTMLElement;
      const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('app-cart-empty .links a'));
      expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
        ['Beats', '/explore'],
        ['Sample packs', '/sample-packs'],
        ['Loops', '/loops'],
      ]);
    });

    it('has no film grain layer, and switches the global one off while it is open', async () => {
      items.set([]);
      const fixture = await render();
      expect((fixture.nativeElement as HTMLElement).querySelector('.grain')).toBeNull();
      expect(document.body.classList.contains('cart-page-active')).toBe(true);

      fixture.destroy();
      expect(document.body.classList.contains('cart-page-active')).toBe(false);
    });

    const fullCart = () =>
      items.set([
        {
          id: 'c1',
          spec: {
            id: 's1',
            title: 'Night Drive',
            producerId: 'p1',
            producerName: 'Nova',
            imageUrl: '/a.webp',
            bpm: 140,
            key: 'C',
          },
          license: {
            name: 'Basic',
            price: 20,
            fileTypes: ['MP3'],
            displayPriceMoney: { amount_minor: 2000, currency: 'USD' },
          },
        },
        {
          id: 'c2',
          spec: {
            id: 's2',
            title: 'Slow Burn',
            producerId: 'p2',
            producerName: 'Kairo',
            imageUrl: '/b.webp',
            bpm: 90,
            key: 'D',
          },
          license: {
            name: 'Premium',
            price: 30,
            fileTypes: ['WAV'],
            displayPriceMoney: { amount_minor: 3000, currency: 'USD' },
          },
        },
      ]);

    it('lays a full cart out as a heading, the items and the summary', async () => {
      fullCart();
      const el = (await render()).nativeElement as HTMLElement;
      const heading = el.querySelector('.head p')?.textContent?.replace(/\s+/g, ' ').trim();
      expect(el.querySelector('h1')?.textContent).toBe('Your cart');
      expect(heading).toBe('2 tracks from 2 producers · ready for instant download');
      expect(el.querySelectorAll('.items app-cart-item')).toHaveLength(2);
      expect(el.querySelector('app-cart-summary')).toBeTruthy();
      expect(el.querySelector('.continue')?.getAttribute('href')).toBe('/explore');
      expect(el.querySelector('app-cart-empty')).toBeNull();
    });

    it('passes the totals to the summary', async () => {
      fullCart();
      const el = (await render()).nativeElement as HTMLElement;
      expect(el.querySelector('app-cart-summary .total strong')?.textContent).toContain('50');
      expect(el.querySelector('app-cart-summary .line dt')?.textContent).toContain('2 items');
    });

    it('removes an item from its row, clears the cart, and checks out', async () => {
      fullCart();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const el = (await render()).nativeElement as HTMLElement;

      (el.querySelectorAll('app-cart-item .remove')[1] as HTMLButtonElement).click();
      expect(removeItem).toHaveBeenCalledWith('c2');

      (el.querySelector('.clear') as HTMLButtonElement).click();
      expect(clear).toHaveBeenCalled();

      (el.querySelector('app-cart-summary .checkout') as HTMLButtonElement).click();
      expect(logSpy).toHaveBeenCalled();
    });

    it('shows the items, not the basket, once there is something in the cart', async () => {
      items.set([
        {
          id: '1',
          spec: {
            id: 's1',
            title: 'Night Drive',
            producerId: 'p1',
            producerName: 'Nova',
            imageUrl: '/a.webp',
            bpm: 140,
            key: 'C',
          },
          license: {
            name: 'Basic',
            price: 20,
            fileTypes: ['MP3'],
            displayPriceMoney: { amount_minor: 2000, currency: 'USD' },
          },
        },
      ]);
      const el = (await render()).nativeElement as HTMLElement;

      expect(el.querySelector('.cart-page')?.classList.contains('is-empty')).toBe(false);
      expect(el.querySelector('app-hairline-basket')).toBeNull();
      expect(el.querySelector('app-cart-item h3')?.textContent).toBe('Night Drive');
    });
  });
});
