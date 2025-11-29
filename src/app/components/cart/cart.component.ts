import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
})
export class CartComponent {
  isOpen = signal(false);
  items;

  constructor(public cartService: CartService) {
    this.items = this.cartService.items;
  }

  get total() {
    return this.cartService.total();
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
