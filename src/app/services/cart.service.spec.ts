import { TestBed } from '@angular/core/testing';
import { MusicalKey } from '../models/enums';
import type { LicenseOption, Spec } from '../models/spec';
import { CartService } from './cart.service';

describe('CartService', () => {
  beforeEach(() => localStorage.clear());
  const baseSpec: Spec = {
    id: 'spec-1',
    type: 'beat',
    category: 'beat',
    imageUrl: 'cover.jpg',
    title: 'First Spec',
    bpm: 140,
    key: MusicalKey.C_MINOR,
    tags: ['dark'],
    price: 20,
    genres: [],
    licenses: [],
  };

  const basicLicense: LicenseOption = {
    id: 'lic-1',
    type: 'Basic',
    name: 'Basic',
    price: 20,
    displayPriceMoney: { amount_minor: 2000, currency: 'USD' },
    features: ['mp3'],
    fileTypes: ['mp3'],
  };

  const premiumLicense: LicenseOption = {
    ...basicLicense,
    id: 'lic-2',
    type: 'Premium',
    name: 'Premium',
    price: 50,
    displayPriceMoney: { amount_minor: 5000, currency: 'USD' },
  };

  it('adds items and updates count and total', () => {
    const service = TestBed.runInInjectionContext(() => new CartService());

    service.addItem(baseSpec, basicLicense);
    service.addItem({ ...baseSpec, id: 'spec-2' }, premiumLicense);

    expect(service.items()).toHaveLength(2);
    expect(service.count()).toBe(2);
    expect(service.total()).toBe(70);
  });

  it('removes an item by id', () => {
    const service = TestBed.runInInjectionContext(() => new CartService());
    service.addItem(baseSpec, basicLicense);
    service.addItem({ ...baseSpec, id: 'spec-2' }, premiumLicense);

    const firstId = service.items()[0].id;
    service.removeItem(firstId);

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].spec.id).toBe('spec-2');
  });

  it('clears all cart items', () => {
    const service = TestBed.runInInjectionContext(() => new CartService());
    service.addItem(baseSpec, basicLicense);

    service.clear();

    expect(service.items()).toEqual([]);
    expect(service.count()).toBe(0);
    expect(service.total()).toBe(0);
  });
  it('restores the cart after a new service instance is created', () => {
    const first = TestBed.runInInjectionContext(() => new CartService());
    first.addItem(baseSpec, basicLicense);
    const restored = TestBed.runInInjectionContext(() => new CartService());
    expect(restored.items()).toHaveLength(1);
    expect(restored.items()[0].spec.id).toBe(baseSpec.id);
    restored.clear();
    expect(TestBed.runInInjectionContext(() => new CartService()).items()).toEqual([]);
  });
  it('ignores malformed storage and refuses to aggregate mixed currencies', () => {
    localStorage.setItem('waveyard.cart.v1', '{broken');
    expect(TestBed.runInInjectionContext(() => new CartService()).items()).toEqual([]);
    localStorage.clear();
    const service = TestBed.runInInjectionContext(() => new CartService());
    service.addItem(baseSpec, basicLicense);
    service.addItem(
      { ...baseSpec, id: 'another' },
      { ...premiumLicense, displayPriceMoney: { currency: 'INR', amount_minor: 5000 } },
    );
    expect(service.hasMixedCurrencies()).toBe(true);
    expect(service.total()).toBe(0);
  });

  it('marks unavailable items and suppresses totalMinor instead of summing as zero', () => {
    const service = TestBed.runInInjectionContext(() => new CartService());
    const unavailableLicense: LicenseOption = {
      ...basicLicense,
      id: 'lic-unavail',
      selectedPrice: {
        price_id: 'p-1',
        revision: 1,
        amount_minor: 0,
        amount_major: 0,
        currency: 'USD',
        is_purchasable: false,
        status: 'unavailable',
      },
    };

    service.addItem(baseSpec, unavailableLicense);
    expect(service.hasUnavailableItems()).toBe(true);
    expect(service.totalMinor()).toBeNull();
    expect(service.totalMoney()).toBeNull();
  });
});
