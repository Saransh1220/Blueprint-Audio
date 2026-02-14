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
  private router = inject(Router);
  private modalService = inject(ModalService);

  navigateToLogin() {
    this.router.navigate(['/auth/login']);
    this.modalService.close();
  }

  navigateToRegister() {
    this.router.navigate(['/auth/register']);
    this.modalService.close();
  }
}
