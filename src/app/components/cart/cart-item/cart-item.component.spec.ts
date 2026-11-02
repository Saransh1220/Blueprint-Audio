import '../../../../test-setup';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { CartItem } from '../../../services/cart.service';
import { CartItemComponent } from './cart-item.component';

const makeItem = (extra: { fileTypes?: string[] } = {}): CartItem =>
  ({
    id: 'c1',
    spec: {
      id: 's1',
      title: 'Night Drive',
      producerName: 'Nova',
      imageUrl: '/cover.webp',
      bpm: 140,
      key: 'C Minor',
    },
    license: {
      id: 'l1',
      name: 'Premium Lease',
      price: 25,
      fileTypes: ['MP3', 'WAV'],
      displayPriceMoney: { amount_minor: 2500, currency: 'USD' },
      ...extra,
    },
  }) as unknown as CartItem;

describe('CartItemComponent', () => {
  let fixture: ComponentFixture<CartItemComponent>;
  let el: HTMLElement;

  const render = (item = makeItem()) => {
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(CartItemComponent);
    el = fixture.nativeElement;
  });

  it('shows the cover, the beat, its producer and tempo and key', () => {
    render();
    const img = el.querySelector('.art') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/cover.webp');
    expect(img.getAttribute('alt')).toBe('Night Drive cover art');
    expect(el.querySelector('h3')?.textContent).toBe('Night Drive');
    const by = el.querySelector('.by')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(by).toBe('Nova · 140 BPM · C Minor');
  });

  it('names the license with the files it includes', () => {
    render();
    expect(el.querySelector('.license strong')?.textContent).toBe('Premium Lease');
    expect(el.querySelector('.license')?.textContent).toContain('MP3 / WAV');
  });

  it('falls back to a plain label when the license lists no file types', () => {
    render(makeItem({ fileTypes: [] }));
    expect(fixture.componentInstance.formats()).toBe('Licensed audio');
    expect(el.querySelector('.license')?.textContent).toContain('Licensed audio');
  });

  it('shows the price', () => {
    render();
    expect(el.querySelector('.price')?.textContent?.trim()).toContain('25');
  });

  it('asks to remove itself, with a label that says which beat', () => {
    const removed = vi.fn();
    fixture.componentInstance.remove.subscribe(removed);
    render();
    const button = el.querySelector('.remove') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Remove Night Drive');
    button.click();
    expect(removed).toHaveBeenCalledTimes(1);
  });
});
