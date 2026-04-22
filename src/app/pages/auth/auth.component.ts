import { Location } from '@angular/common';
import { Component, effect, inject, type OnDestroy, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SocialAuthService, GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, GoogleSigninButtonModule, RouterLink],
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
  showLoginPassword = false;
  showRegisterPassword = false;

  loginEmail = '';
  loginPassword = '';

  registerUsername = '';
  registerDisplayName = '';
  registerEmail = '';
  registerPassword = '';
  registerConfirmPassword = '';
  registerRole: 'artist' | 'producer' = 'artist';

  readonly tickerItems = [
    'Cult Beats Auth',
    'Sign in and keep your crate close',
    'New drops every Friday',
    'Artists and producers welcome',
  ];

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
      this.themeService.activeTheme();
    });
  }

  ngOnInit() {
    const path = this.route.snapshot.url[0]?.path;
    this.isLoginView = path !== 'register';
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  get pageTitle() {
    return this.isLoginView ? 'Welcome back' : 'Create your account';
  }

  get pageDescription() {
    return this.isLoginView
      ? 'Access your account and continue your journey with us.'
      : 'Set up your account and start sharing your sound.';
  }

  get submitLabel() {
    return this.isLoginView ? 'Sign In' : 'Create Account';
  }

  brandChips() {
    return this.isLoginView
      ? [
          { number: '#0241', text: 'Violet Hour', emphasis: '- Kita Sol' },
          { number: 'NEW', text: '140 BPM drops every', emphasis: 'Friday' },
        ]
      : [
          { number: 'SIDE B', text: 'Claim your handle and', emphasis: 'start building' },
          { number: 'DROP', text: 'Upload, license, and sell', emphasis: 'faster' },
        ];
  }

  passwordStrength() {
    const score = this.scorePassword(this.registerPassword);
    const labels = ['-', 'weak', 'ok', 'good', 'strong'];
    return { score, label: labels[score] };
  }

  passwordsMatch() {
    return !!this.registerConfirmPassword && this.registerPassword === this.registerConfirmPassword;
  }

  toggleView(isLogin: boolean) {
    if (this.isLoginView === isLogin) return;

    this.isLoginView = isLogin;
    this.location.go(isLogin ? '/login' : '/register');
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

  private scorePassword(password: string) {
    if (!password) return 0;

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

    return Math.min(score, 4);
  }
}
