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
  private itemsSignal = signal<CartItem[]>([]);

  readonly items = this.itemsSignal.asReadonly();

  readonly total = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.license.price, 0),
  );

  readonly count = computed(() => this.itemsSignal().length);

  addItem(spec: Spec, license: LicenseOption) {
    const newItem: CartItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      spec,
      license,
    };

    this.itemsSignal.update((items) => [...items, newItem]);
  }

  removeItem(cartItemId: string) {
    this.itemsSignal.update((items) => items.filter((item) => item.id !== cartItemId));
  }

  clear() {
    this.itemsSignal.set([]);
  }
}
