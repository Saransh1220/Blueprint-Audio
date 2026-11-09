import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-currency-price-field',
  imports: [CommonModule],
  templateUrl: './currency-price-field.component.html',
  styleUrl: './currency-price-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-currency-price-field',
    '[class.has-error]': '!!error()',
    '[class.is-disabled]': 'disabled()',
  },
})
export class CurrencyPriceFieldComponent {
  readonly currency = input.required<string>();
  readonly value = input<string | number>('');
  readonly label = input<string>('');
  readonly symbol = input<string>('$');
  readonly isNative = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly showAutoFill = input<boolean>(false);
  readonly autoFillLoading = input<boolean>(false);
  readonly rateInfo = input<string | null>(null);
  readonly isStale = input<boolean>(false);
  readonly placeholder = input<string>('0.00');

  readonly valueChange = output<string>();
  readonly autoFill = output<void>();

  onInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }

  onAutoFillClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled() && !this.autoFillLoading()) {
      this.autoFill.emit();
    }
  }
}
