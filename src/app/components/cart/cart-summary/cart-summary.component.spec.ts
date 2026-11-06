import '../../../../test-setup';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { CartSummaryComponent } from './cart-summary.component';

describe('CartSummaryComponent', () => {
  let fixture: ComponentFixture<CartSummaryComponent>;
  let el: HTMLElement;

  const render = (inputs: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
  };
  const text = (selector: string) =>
    el.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const button = () => el.querySelector('.checkout') as HTMLButtonElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(CartSummaryComponent);
    el = fixture.nativeElement;
  });

  it('adds the items up, as subtotal and total', () => {
    render({ itemCount: 3, totalMoney: { amount_minor: 7500, currency: 'USD' } });
    expect(text('.line dt')).toBe('Subtotal (3 items)');
    expect(text('.line dd')).toContain('75');
    expect(text('.total strong')).toContain('75');
  });

  it('says "item" for a single item', () => {
    render({ itemCount: 1, totalMoney: { amount_minor: 2500, currency: 'USD' } });
    expect(text('.line dt')).toBe('Subtotal (1 item)');
  });

  it('does not substitute a scalar when the money total is unavailable', () => {
    render({ itemCount: 2, total: 40 });
    expect(text('.total strong')).toBe('—');
    expect(text('.line dd')).toBe('Unavailable');
  });

  it('leaves taxes for checkout', () => {
    render({ itemCount: 1 });
    expect(text('.line.muted dt')).toBe('Taxes & fees');
    expect(text('.line.muted dd')).toBe('Calculated at checkout');
  });

  it('checks out from the button', () => {
    const checkout = vi.fn();
    fixture.componentInstance.checkout.subscribe(checkout);
    render({ itemCount: 1, totalMoney: { amount_minor: 2500, currency: 'USD' } });
    expect(button().textContent).toContain('Cart checkout is not available yet');
    expect(button().disabled).toBe(true);
    button().click();
    expect(checkout).not.toHaveBeenCalled();
  });

  it('does not invent one total for mixed currencies, and blocks checkout', () => {
    render({ itemCount: 2, mixedCurrencies: true, totalMoney: null });
    expect(text('.line dd')).toBe('Mixed currencies');
    expect(text('.total strong')).toBe('—');
    expect(button().disabled).toBe(true);
    expect(button().textContent).toContain('Cart checkout is not available yet');
  });

  it('lists what the buyer can count on', () => {
    render({ itemCount: 1 });
    expect(el.querySelectorAll('.trust li')).toHaveLength(3);
  });
});
