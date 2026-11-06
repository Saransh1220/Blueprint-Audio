import { BRAND } from '../../../core/config/brand';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-auth-requirement',
  standalone: true,
  templateUrl: './auth-requirement.component.html',
  styleUrl: './auth-requirement.component.scss',
})
export class AuthRequirementComponent {
  readonly brand = BRAND;
  readonly perks = [
    { icon: 'fa-heart', label: 'Save beats you like' },
    { icon: 'fa-cart-shopping', label: 'Keep your cart' },
    { icon: 'fa-clock-rotate-left', label: 'Pick up where you left off' },
  ];

  private router = inject(Router);
  private modalService = inject(ModalService);

  navigateToLogin() {
    this.router.navigate(['/login']);
    this.modalService.close();
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
    this.modalService.close();
  }

  dismiss() {
    this.modalService.close();
  }
}
