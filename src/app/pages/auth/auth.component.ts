import { Location } from '@angular/common';
import { Component, effect, inject, type OnDestroy, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { SocialAuthService, GoogleSigninButtonModule } from '@abacritt/angularx-social-login';

import { LoadingSpinnerComponent } from '../../components';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, LoadingSpinnerComponent, GoogleSigninButtonModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private toastService = inject(ToastService);
  private socialAuthService = inject(SocialAuthService);

  isLoginView = true;
  isLoading = signal(false);

  // Login Form Data
  loginEmail = '';
  loginPassword = '';

  // Register Form Data
  registerUsername = '';
  registerDisplayName = '';
  registerEmail = '';
  registerPassword = '';
  registerConfirmPassword = '';
  registerRole: 'artist' | 'producer' = 'artist';

  private authSubscription?: Subscription;

  constructor() {
    this.authSubscription = this.socialAuthService.authState.subscribe((user) => {
      if (user && user.idToken) {
        this.isLoading.set(true);
        this.authService.googleLogin(user.idToken).subscribe({
          next: () => {
            this.isLoading.set(false);
            this.toastService.show('Welcome to Blueprint Audio!', 'success');
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.toastService.show(
              'Google Login failed: ' + (err.error?.error || 'Unknown error'),
              'error',
            );
          },
        });
      }
    });

    effect(() => {
      // Just consuming theme service to ensure it initializes,
      // specific color tracking forcanvas removed since canvas is removed.
      this.themeService.activeTheme();
    });
  }

  ngOnInit() {
    // Check URL to determine initial state
    const path = this.route.snapshot.url[0]?.path;
    if (path === 'register') {
      this.isLoginView = false;
    } else {
      this.isLoginView = true;
    }
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  toggleView(isLogin: boolean) {
    if (this.isLoginView === isLogin) return;

    this.isLoginView = isLogin;

    // Update URL without reloading
    const url = isLogin ? '/login' : '/register';
    this.location.go(url);
  }

  onLoginSubmit() {
    if (!this.loginEmail || !this.loginPassword) {
      this.toastService.show('Please enter email and password', 'error');
      return;
    }

    this.isLoading.set(true);
    this.authService
      .login({
        email: this.loginEmail,
        password: this.loginPassword,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.toastService.show('Welcome back!', 'success');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.error?.error === 'email not verified') {
            this.toastService.show('Verify your email before signing in.', 'error');
            this.router.navigate(['/verify-email'], {
              queryParams: { email: this.loginEmail },
            });
            return;
          }
          this.toastService.show(
            'Login failed: ' + (err.error?.error || 'Invalid credentials'),
            'error',
          );
        },
      });
  }

  onRegisterSubmit() {
    if (
      !this.registerUsername ||
      !this.registerEmail ||
      !this.registerPassword ||
      !this.registerConfirmPassword ||
      !this.registerDisplayName
    ) {
      this.toastService.show('Please fill in all fields', 'error');
      return;
    }

    if (this.registerPassword !== this.registerConfirmPassword) {
      this.toastService.show('Passwords do not match', 'error');
      return;
    }

    if (this.registerPassword.length < 8) {
      this.toastService.show('Password must be at least 8 characters', 'error');
      return;
    }

    this.isLoading.set(true);
    this.authService
      .register({
        name: this.registerUsername,
        display_name: this.registerDisplayName,
        email: this.registerEmail,
        password: this.registerPassword,
        role: this.registerRole,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.toastService.show(
            'Account created. Check your inbox for the verification code.',
            'success',
          );
          this.router.navigate(['/verify-email'], {
            queryParams: { email: this.registerEmail },
          });
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toastService.show(
            'Registration failed: ' + (err.error?.error || 'Unknown error'),
            'error',
          );
        },
      });
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password'], {
      queryParams: { email: this.loginEmail || undefined },
    });
  }
}
