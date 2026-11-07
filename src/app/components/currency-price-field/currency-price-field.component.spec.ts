import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyPriceFieldComponent } from './currency-price-field.component';

@Component({
  imports: [CurrencyPriceFieldComponent],
  template: `
    <app-currency-price-field
      [currency]="currency()"
      [value]="value()"
      [label]="label()"
      [symbol]="symbol()"
      [isNative]="isNative()"
      [disabled]="disabled()"
      [error]="error()"
      [showAutoFill]="showAutoFill()"
      [autoFillLoading]="autoFillLoading()"
      [rateInfo]="rateInfo()"
      [isStale]="isStale()"
      (valueChange)="onValueChange($event)"
      (autoFill)="onAutoFill()"
    />
  `,
})
class TestHostComponent {
  readonly currency = signal('USD');
  readonly value = signal('19.99');
  readonly label = signal('US Dollar Price');
  readonly symbol = signal('$');
  readonly isNative = signal(false);
  readonly disabled = signal(false);
  readonly error = signal<string | null>(null);
  readonly showAutoFill = signal(false);
  readonly autoFillLoading = signal(false);
  readonly rateInfo = signal<string | null>(null);
  readonly isStale = signal(false);

  onValueChange = vi.fn();
  onAutoFill = vi.fn();
}

describe('CurrencyPriceFieldComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('renders input, symbol, currency code and label', () => {
    const input = element.querySelector<HTMLInputElement>('.price-input')!;
    expect(input.value).toBe('19.99');

    const prefix = element.querySelector('.currency-prefix')!;
    expect(prefix.textContent?.trim()).toBe('$');

    const code = element.querySelector('.currency-code')!;
    expect(code.textContent?.trim()).toBe('USD');

    const label = element.querySelector('.field-label')!;
    expect(label.textContent?.trim()).toBe('US Dollar Price');
  });

  it('renders native badge when isNative is true', () => {
    expect(element.querySelector('.native-badge')).toBeNull();

    host.isNative.set(true);
    fixture.detectChanges();

    const badge = element.querySelector('.native-badge')!;
    expect(badge).not.toBeNull();
    expect(badge.textContent?.trim()).toBe('Native');
  });

  it('emits valueChange on input event', () => {
    const input = element.querySelector<HTMLInputElement>('.price-input')!;
    input.value = '24.99';
    input.dispatchEvent(new Event('input'));

    expect(host.onValueChange).toHaveBeenCalledWith('24.99');
  });

  it('renders autofill button and emits autoFill on click', () => {
    expect(element.querySelector('.autofill-btn')).toBeNull();

    host.showAutoFill.set(true);
    fixture.detectChanges();

    const btn = element.querySelector<HTMLButtonElement>('.autofill-btn')!;
    expect(btn).not.toBeNull();
    btn.click();

    expect(host.onAutoFill).toHaveBeenCalled();
  });

  it('disables autofill button and input when disabled is true', () => {
    host.showAutoFill.set(true);
    host.disabled.set(true);
    fixture.detectChanges();

    const input = element.querySelector<HTMLInputElement>('.price-input')!;
    const btn = element.querySelector<HTMLButtonElement>('.autofill-btn')!;

    expect(input.disabled).toBe(true);
    expect(btn.disabled).toBe(true);

    btn.click();
    expect(host.onAutoFill).not.toHaveBeenCalled();
  });

  it('displays loading state during autofill', () => {
    host.showAutoFill.set(true);
    host.autoFillLoading.set(true);
    fixture.detectChanges();

    const btn = element.querySelector<HTMLButtonElement>('.autofill-btn')!;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Calculating...');
  });

  it('displays error message when provided', () => {
    expect(element.querySelector('.field-error-message')).toBeNull();

    host.error.set('Invalid price amount');
    fixture.detectChanges();

    const errorEl = element.querySelector('.field-error-message')!;
    expect(errorEl.textContent).toContain('Invalid price amount');
    expect(element.querySelector('.field-input-box')?.classList.contains('field-input-error')).toBe(true);
  });

  it('displays rate info and stale badge when rate is stale', () => {
    expect(element.querySelector('.rate-status')).toBeNull();

    host.rateInfo.set('As of 10:00 UTC');
    host.isStale.set(true);
    fixture.detectChanges();

    const rateStatus = element.querySelector('.rate-status')!;
    expect(rateStatus.textContent).toContain('As of 10:00 UTC');
    expect(rateStatus.querySelector('.stale-badge')?.textContent).toContain('Stale rate');
  });
});
