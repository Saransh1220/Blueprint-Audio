import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { LoadingSpinnerComponent } from '../../../components';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  email = '';
  code = '';
  newPassword = '';
  confirmPassword = '';
  isSubmitting = signal(false);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.email = params.get('email') ?? this.email;
      this.code = params.get('code') ?? this.code;
    });
  }

  onSubmit(): void {
    if (!this.email || !this.code || !this.newPassword || !this.confirmPassword) {
      this.toastService.show('Fill in every field to finish the reset.', 'error');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toastService.show('Passwords do not match.', 'error');
      return;
    }
    if (this.newPassword.length < 8) {
      this.toastService.show('Password must be at least 8 characters.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.authService
      .resetPassword({
        email: this.email,
        code: this.code,
        new_password: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastService.show(
            'Password reset complete. Sign in with your new password.',
            'success',
          );
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toastService.show(err.error?.error || 'Reset failed. Try the latest code.', 'error');
        },
      });
  }
}
