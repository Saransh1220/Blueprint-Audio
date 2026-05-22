import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../../services/currency.service';
import type { Money } from '../../models/money';

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
