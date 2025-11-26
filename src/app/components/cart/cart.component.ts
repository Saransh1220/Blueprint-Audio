import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Spec } from '../../models/spec';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
})
export class CartComponent {
  isOpen = signal(false);
  items = signal<Spec[]>([]);

  toggle() {
    this.isOpen.update((v) => !v);
  }

  removeItem(id: string) {
    this.items.update((current) => current.filter((item) => item.id !== id));
  }

  get total() {
    return this.items().reduce((sum, item) => sum + item.price, 0);
  }

  checkout() {
    console.log('Proceeding to checkout with items:', this.items());
    // TODO: Implement Stripe/Payment logic
  }
}
