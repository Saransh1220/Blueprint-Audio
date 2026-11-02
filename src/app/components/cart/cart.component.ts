import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AppCurrency, Money } from '../../models/money';
import { CartService } from '../../services';
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
    const currencies = new Set(
      items
        .map((item) => item.license?.displayPriceMoney?.currency)
        .filter((currency): currency is AppCurrency => !!currency),
    );
    const hasMixedCurrencies = currencies.size > 1;
    const currency = items[0]?.license?.displayPriceMoney?.currency;
    const totalMoney =
      !hasMixedCurrencies && currency
        ? {
            amount_minor: items.reduce(
              (sum, item) => sum + (item.license?.displayPriceMoney?.amount_minor ?? 0),
              0,
            ),
            currency,
          }
        : null;

    return {
      hasMixedCurrencies,
      totalMoney,
      producerCount: new Set(items.map((item) => item.spec?.producerId).filter(Boolean)).size,
    };
  });

  constructor() {
    this.items = this.cartService.items;

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
    return this.summary().totalMoney;
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
    console.log('Proceeding to checkout with items:', this.cartService.items());
    // TODO: Implement Stripe/Payment logic
  }
}
