import { inject, Pipe, PipeTransform } from '@angular/core';
import type { Money } from '../../models/money';
import { CurrencyService } from '../../services/currency.service';

@Pipe({
  name: 'money',
  standalone: true,
})
export class MoneyPipe implements PipeTransform {
  private currency = inject(CurrencyService);

  transform(value?: Money | null, fallbackAmount?: number): string {
    return this.currency.formatMoney(value, fallbackAmount);
  }
}
