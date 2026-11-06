import { inject, Pipe, PipeTransform } from '@angular/core';
import type { Money, SelectedPriceOffer } from '../../models/money';
import { CurrencyService } from '../../services/currency.service';

@Pipe({
  name: 'money',
  standalone: true,
})
export class MoneyPipe implements PipeTransform {
  private currency = inject(CurrencyService);

  transform(
    value?: Money | null,
    fallbackAmount?: number,
    offer?: SelectedPriceOffer | null,
  ): string {
    if (offer) {
      if (!offer.is_purchasable || offer.selection === 'unavailable') return 'Unavailable';
      return this.currency.formatMoney({
        amount_minor: offer.amount_minor,
        currency: offer.currency,
      });
    }
    return this.currency.formatMoney(value, fallbackAmount);
  }
}
