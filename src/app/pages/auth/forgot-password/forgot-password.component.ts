import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { LoadingSpinnerComponent } from '../../../components';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  email = '';
  isSubmitting = signal(false);

  onSubmit(): void {
    if (!this.email) {
      this.toastService.show('Enter the email for your account.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.show('If the account exists, a reset code has been sent.', 'success');
        this.router.navigate(['/reset-password'], { queryParams: { email: this.email } });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastService.show(err.error?.error || 'Could not start password reset.', 'error');
      },
    });
  }
}
