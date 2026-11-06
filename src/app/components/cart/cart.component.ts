import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Money } from '../../models/money';
import { CartService } from '../../services';
import { summarizeCartMoney } from '../../utils/cart-money';
import { CartEmptyComponent } from './cart-empty/cart-empty.component';
import { CartItemComponent } from './cart-item/cart-item.component';
import { CartSummaryComponent } from './cart-summary/cart-summary.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CartItemComponent, CartSummaryComponent, CartEmptyComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
})
export class CartComponent {
  cartService = inject(CartService);

  items;
  private readonly summary = computed(() => {
    const items = this.cartService.items();
    return {
      ...summarizeCartMoney(items),
      producerCount: new Set(items.map((item) => item.spec?.producerId).filter(Boolean)).size,
    };
  });

  constructor() {
    this.items = this.cartService.items;
    this.cartService.refresh();

    // A calm page: no film grain over the cart.
    const body = inject(DOCUMENT).body;
    body.classList.add('cart-page-active');
    inject(DestroyRef).onDestroy(() => body.classList.remove('cart-page-active'));
  }

  get total() {
    return this.cartService.total();
  }

  get hasMixedCurrencies() {
    return this.summary().hasMixedCurrencies;
  }

  get totalMoney(): Money | null {
    return this.cartService.isRefreshing() || this.cartService.needsRefresh()
      ? null
      : this.summary().totalMoney;
  }

  removeItem(id: string) {
    this.cartService.removeItem(id);
  }

  clearCart() {
    this.cartService.clear();
  }

  get producerCount() {
    return this.summary().producerCount;
  }

  checkout() {
    // Cart checkout remains disabled until the multi-item order contract is implemented.
  }
}
