import { computed, Injectable, signal } from '@angular/core';
import type { LicenseOption, Spec } from '../models';

export interface CartItem {
  id: string; // Unique ID for the cart item (e.g., timestamp)
  spec: Spec;
  license: LicenseOption;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly storageKey = 'waveyard.cart.v1';
  private itemsSignal = signal<CartItem[]>(this.restore());
  private persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.itemsSignal()));
    } catch {
      /* Keep the in-memory cart usable. */
    }
  }
  private restore(): CartItem[] {
    try {
      const items: unknown = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      if (!Array.isArray(items)) return [];
      return items.filter(
        (item): item is CartItem =>
          !!item &&
          typeof item.id === 'string' &&
          typeof item.spec?.id === 'string' &&
          typeof item.license?.id === 'string' &&
          Number.isFinite(item.license.price) &&
          item.license.price >= 0,
      );
    } catch {
      return [];
    }
  }
  readonly hasMixedCurrencies = computed(() => {
    const currencies = this.itemsSignal().map(
      (item) => item.license.displayPriceMoney?.currency ?? item.license.priceMoney?.currency,
    );
    return currencies.some((currency) => !currency) || new Set(currencies).size > 1;
  });

  readonly items = this.itemsSignal.asReadonly();

  readonly total = computed(() =>
    this.hasMixedCurrencies()
      ? 0
      : this.itemsSignal().reduce((sum, item) => sum + item.license.price, 0),
  );

  readonly count = computed(() => this.itemsSignal().length);

  addItem(spec: Spec, license: LicenseOption) {
    if (
      this.itemsSignal().some((item) => item.spec.id === spec.id && item.license.id === license.id)
    )
      return;
    const newItem: CartItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      spec,
      license,
    };

    this.itemsSignal.update((items) => [...items, newItem]);
    this.persist();
  }

  removeItem(cartItemId: string) {
    this.itemsSignal.update((items) => items.filter((item) => item.id !== cartItemId));
    this.persist();
  }

  clear() {
    this.itemsSignal.set([]);
    this.persist();
  }
}
