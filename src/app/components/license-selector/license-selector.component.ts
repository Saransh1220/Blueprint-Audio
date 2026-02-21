import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import type { LicenseOption, Spec } from '../../models';
import { CartService } from '../../services/cart.service';
import { ModalService } from '../../services/modal.service';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-license-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './license-selector.component.html',
  styleUrls: ['./license-selector.component.scss'],
})
export class LicenseSelectorComponent {
  private cartService = inject(CartService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  private paymentService = inject(PaymentService);

  @Input() spec!: Spec;

  // Add to cart (original functionality)
  addToCart(license: LicenseOption) {
    this.cartService.addItem(this.spec, license);
    this.toastService.show(`Added ${this.spec.title} (${license.name}) to cart`, 'success');
    this.modalService.close();
  }

  // Buy now with Razorpay
  buyNow(license: LicenseOption, event: Event) {
    event.stopPropagation(); // Prevent card click
    this.modalService.close();

    // Initiate payment flow
    this.paymentService.initiatePayment(this.spec.id, license.id, this.spec.title).subscribe({
      error: (err) => {
        console.error('Payment initiation failed:', err);
      },
    });
  }
}
