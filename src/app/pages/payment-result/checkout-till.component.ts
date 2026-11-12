import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import CheckoutTill from './checkout-till';

@Component({
  selector: 'app-checkout-till',
  template: '',
  styleUrl: './checkout-till.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CheckoutTillComponent {
  readonly total = input.required<string>();
  readonly reference = input.required<string>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const root = createRoot(host.nativeElement);
      root.render(
        createElement(CheckoutTill, { total: this.total(), reference: this.reference() }),
      );
      destroyRef.onDestroy(() => root.unmount());
    });
  }
}
