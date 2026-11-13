import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import type { CurrencyDefinition } from '../../models/money';
import { BuyerCurrencyService } from '../../services/buyer-currency.service';
import { CurrencyConfigurationService } from '../../services/currency-configuration.service';

@Component({
  selector: 'app-currency-switcher',
  imports: [CommonModule],
  templateUrl: './currency-switcher.component.html',
  styleUrl: './currency-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
})
export class CurrencySwitcherComponent {
  private readonly buyerCurrency = inject(BuyerCurrencyService);
  private readonly configService = inject(CurrencyConfigurationService);
  private readonly elementRef = inject(ElementRef);

  readonly isOpen = signal(false);
  readonly effectiveCurrency = this.buyerCurrency.effective;
  readonly isAutomatic = this.buyerCurrency.isAutomatic;
  readonly preference = this.buyerCurrency.preference;
  readonly isLoading = this.buyerCurrency.isLoading;

  readonly availableCurrencies = computed<readonly CurrencyDefinition[]>(() => {
    const list = this.configService.currencies();
    if (this.configService.status() !== 'loaded') {
      return list;
    }
    return list.filter((c) => c.gateway !== null);
  });

  toggle() {
    this.isOpen.update((v) => !v);
  }

  close() {
    this.isOpen.set(false);
  }

  select(currency: string | null) {
    this.buyerCurrency.set(currency).subscribe({
      next: () => this.close(),
      error: () => this.close(),
    });
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
