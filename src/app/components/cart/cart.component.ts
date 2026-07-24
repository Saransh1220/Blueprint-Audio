import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import type { AppCurrency, Money } from '../../models/money';
import { CartService } from '../../services';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, MoneyPipe],
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
