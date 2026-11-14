import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  model,
  viewChild,
} from '@angular/core';
import { catchError, EMPTY } from 'rxjs';
import { HoverPopupDirective, isKeyboardOrTouchActivation } from '../header/hover-popup.directive';
import type { CurrencyDefinition } from '../../models/money';
import { BuyerCurrencyService } from '../../services/buyer-currency.service';
import { CurrencyConfigurationService } from '../../services/currency-configuration.service';

@Component({
  selector: 'app-currency-switcher',
  imports: [CommonModule, HoverPopupDirective],
  templateUrl: './currency-switcher.component.html',
  styleUrl: './currency-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:pointerdown)': 'onDocumentClick($event)',
    '(document:focusin)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'dismiss($event)',
  },
})
export class CurrencySwitcherComponent {
  private readonly buyerCurrency = inject(BuyerCurrencyService);
  private readonly configService = inject(CurrencyConfigurationService);
  private readonly elementRef = inject(ElementRef);

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  readonly isOpen = model(false);
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

  toggle(event?: MouseEvent) {
    if (!isKeyboardOrTouchActivation(event)) return;
    this.isOpen.update((v) => !v);
  }

  close() {
    this.isOpen.set(false);
  }

  dismiss(event: Event) {
    if (!this.isOpen() || event.defaultPrevented) return;
    event.preventDefault();
    this.close();
    this.trigger()?.nativeElement.focus();
  }

  select(currency: string | null) {
    this.close();
    this.trigger()?.nativeElement.focus();
    this.buyerCurrency
      .set(currency)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  onDocumentClick(event: Event) {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
