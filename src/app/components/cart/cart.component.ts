import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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

  isOpen = signal(false);
  items;

  constructor() {
    this.items = this.cartService.items;
  }

  get total() {
    return this.cartService.total();
  }

  get hasMixedCurrencies() {
    const items = this.cartService.items();
    const currencies = new Set(
      items
        .map((item) => item.license?.displayPriceMoney?.currency)
        .filter((currency): currency is AppCurrency => !!currency),
    );
    return currencies.size > 1;
  }

  get totalMoney(): Money | null {
    const items = this.cartService.items();
    if (this.hasMixedCurrencies) return null;

    const currency = items[0]?.license?.displayPriceMoney?.currency;
    if (!currency) return null;
    const amountMinor = items.reduce(
      (sum, item) => sum + (item.license?.displayPriceMoney?.amount_minor ?? 0),
      0,
    );
    return {
      amount_minor: amountMinor,
      currency,
    };
  }

  toggle() {
    this.isOpen.update((v) => !v);
  }

  removeItem(id: string) {
    this.cartService.removeItem(id);
  }

  checkout() {
    console.log('Proceeding to checkout with items:', this.cartService.items());
    // TODO: Implement Stripe/Payment logic
  }
}
