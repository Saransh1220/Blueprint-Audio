import '../../../../test-setup';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartEmptyComponent } from './cart-empty.component';

vi.mock('@lucasmarkes/hairline', () => ({
  basket: vi.fn(() => ({ update: vi.fn(), destroy: vi.fn() })),
}));

describe('CartEmptyComponent', () => {
  let fixture: ComponentFixture<CartEmptyComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(CartEmptyComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('puts the drawn basket first, as the page heading names the state', () => {
    expect(el.querySelector('app-hairline-basket .figure')).toBeTruthy();
    expect(el.querySelector('h1')?.textContent).toContain('Your cart is empty');
    expect(el.querySelector('h1')?.id).toBe('cart-title');
  });

  it('keeps the words short', () => {
    expect(el.querySelector('p')?.textContent?.trim()).toBe(
      'Pick a beat, choose a license, and it will wait here.',
    );
  });

  it('offers one clear way forward', () => {
    const cta = el.querySelector<HTMLAnchorElement>('.browse');
    expect(cta?.textContent).toContain('Explore the catalog');
    expect(cta?.getAttribute('href')).toBe('/explore');
  });

  it('links on to each catalogue', () => {
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.links a'));
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Beats', '/explore'],
      ['Sample packs', '/sample-packs'],
      ['Loops', '/loops'],
    ]);
  });
});
