import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import type { LicenseOption, Spec } from '../../models/spec';
import { CartService } from '../../services/cart.service';
import { ModalService } from '../../services/modal.service';
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

  @Input() spec!: Spec;

  selectLicense(license: LicenseOption) {
    this.cartService.addItem(this.spec, license);
    this.toastService.show(`Added ${this.spec.title} (${license.name}) to cart`, 'success');
    this.modalService.close();
  }
}
