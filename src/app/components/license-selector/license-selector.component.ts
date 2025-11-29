import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Spec, LicenseOption } from '../../models/spec';
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
  @Input() spec!: Spec;

  constructor(
    private cartService: CartService,
    private modalService: ModalService,
    private toastService: ToastService,
  ) {}

  selectLicense(license: LicenseOption) {
    this.cartService.addItem(this.spec, license);
    this.toastService.show(`Added ${this.spec.title} (${license.name}) to cart`, 'success');
    this.modalService.close();
  }
}
