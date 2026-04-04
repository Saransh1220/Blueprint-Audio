import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { LoadingSpinnerComponent } from '../../../components';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  email = '';
  code = '';
  isSubmitting = signal(false);
  isResending = signal(false);
  private autoSubmitted = false;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.email = params.get('email') ?? this.email;
      this.code = params.get('code') ?? this.code;

      if (!this.autoSubmitted && this.email && this.code.length >= 6) {
        this.autoSubmitted = true;
        queueMicrotask(() => this.onVerifySubmit());
      }
    });
  }

  onVerifySubmit(): void {
    if (!this.email || !this.code) {
      this.toastService.show('Enter both email and verification code.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.authService.verifyEmail({ email: this.email, code: this.code }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.show('Email verified. You can sign in now.', 'success');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastService.show(err.error?.error || 'Verification failed. Try again.', 'error');
      },
    });
  }

  onResendCode(): void {
    if (!this.email) {
      this.toastService.show('Enter your email first.', 'error');
      return;
    }

    this.isResending.set(true);
    this.authService.resendVerification(this.email).subscribe({
      next: () => {
        this.isResending.set(false);
        this.toastService.show('A fresh verification code is on its way.', 'success');
      },
      error: (err) => {
        this.isResending.set(false);
        this.toastService.show(err.error?.error || 'Could not resend the code.', 'error');
      },
    });
  }
}
