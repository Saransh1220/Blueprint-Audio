import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { CurrencySwitcherComponent } from './currency-switcher.component';
import { BuyerCurrencyService } from '../../services/buyer-currency.service';
import { CurrencyConfigurationService } from '../../services/currency-configuration.service';
import { signal } from '@angular/core';

describe('CurrencySwitcherComponent', () => {
  let component: CurrencySwitcherComponent;
  let fixture: ComponentFixture<CurrencySwitcherComponent>;
  let buyerCurrencyMock: {
    preference: ReturnType<typeof signal>;
    effective: ReturnType<typeof signal>;
    source: ReturnType<typeof signal>;
    isAutomatic: ReturnType<typeof signal>;
    isLoading: ReturnType<typeof signal>;
    set: ReturnType<typeof vi.fn>;
  };
  let configServiceMock: {
    currencies: ReturnType<typeof signal>;
    status: ReturnType<typeof signal>;
  };

  beforeEach(async () => {
    buyerCurrencyMock = {
      preference: signal<string | null>(null),
      effective: signal<string>('USD'),
      source: signal('default'),
      isAutomatic: signal<boolean>(true),
      isLoading: signal<boolean>(false),
      set: vi.fn().mockReturnValue(of({ preference: 'INR', effective: 'INR', source: 'profile' })),
    };

    configServiceMock = {
      currencies: signal([
        { code: 'INR', symbol: '₹', minor_unit_scale: 100, locale: 'en-IN', gateway: 'razorpay' },
        { code: 'USD', symbol: '$', minor_unit_scale: 100, locale: 'en-US', gateway: 'dodo' },
        { code: 'EUR', symbol: '€', minor_unit_scale: 100, locale: 'de-DE', gateway: null },
      ]),
      status: signal<'fallback' | 'loaded' | 'unavailable'>('loaded'),
    };

    await TestBed.configureTestingModule({
      imports: [CurrencySwitcherComponent],
      providers: [
        { provide: BuyerCurrencyService, useValue: buyerCurrencyMock },
        { provide: CurrencyConfigurationService, useValue: configServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CurrencySwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders trigger button with current effective currency and Auto badge when automatic', () => {
    const btn = fixture.nativeElement.querySelector('.currency-trigger-btn');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('USD');
    expect(btn.textContent).toContain('Auto');
  });

  it('filters out currencies with null gateway when not in fallback mode', () => {
    const list = component.availableCurrencies();
    expect(list.map((c) => c.code)).toEqual(['INR', 'USD']);
  });

  it('includes all currencies when in fallback mode', () => {
    configServiceMock.status.set('fallback');
    fixture.detectChanges();
    const list = component.availableCurrencies();
    expect(list.map((c) => c.code)).toEqual(['INR', 'USD', 'EUR']);
  });

  it('toggles dropdown visibility on click', () => {
    expect(component.isOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.currency-dropdown')).toBeNull();

    component.toggle();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('.currency-dropdown')).not.toBeNull();

    component.close();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('selects automatic mode and closes dropdown', () => {
    component.toggle();
    fixture.detectChanges();

    component.select(null);
    expect(buyerCurrencyMock.set).toHaveBeenCalledWith(null);
    expect(component.isOpen()).toBe(false);
  });

  it('selects a specific currency and closes dropdown', () => {
    component.toggle();
    fixture.detectChanges();

    component.select('INR');
    expect(buyerCurrencyMock.set).toHaveBeenCalledWith('INR');
    expect(component.isOpen()).toBe(false);
  });

  it('closes dropdown on document click outside component', () => {
    component.toggle();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);
    component.onDocumentClick({ target: outsideElement } as unknown as MouseEvent);

    expect(component.isOpen()).toBe(false);
    document.body.removeChild(outsideElement);
  });
});
