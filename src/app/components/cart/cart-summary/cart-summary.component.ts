import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Money } from '../../../models/money';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

/** The order summary: what the cart adds up to, and the way to check out. */
@Component({
  selector: 'app-cart-summary',
  imports: [MoneyPipe],
  templateUrl: './cart-summary.component.html',
  styleUrl: './cart-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartSummaryComponent {
  readonly itemCount = input.required<number>();
  /** The total as money, or null when it cannot be one number (no prices, mixed currencies). */
  readonly totalMoney = input<Money | null>(null);
  /** The plain total, used when there is no money to show. */
  readonly total = input(0);
  /** The items are priced in more than one currency, so there is no single total. */
  readonly mixedCurrencies = input(false);

  readonly checkout = output<void>();
}
