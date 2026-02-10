import { Location } from '@angular/common';
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  effect,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { Particle } from '../../models/particle';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';

import { LoadingSpinnerComponent } from '../../components';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, LoadingSpinnerComponent],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private toastService = inject(ToastService);

  isRightPanelActive = false;
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

  @ViewChild('fluidCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId!: number;
  private particles: Particle[] = [];
  private width = 0;
  private height = 0;
  private rgb = { r: 255, g: 51, b: 0 }; // Default red

  constructor() {
    effect(() => {
      const themeId = this.themeService.activeTheme();
      const theme = this.themeService.themes.find((t) => t.id === themeId);
      if (theme) {
        this.rgb = this.hexToRgb(theme.colors[0]);
      }
    });
  }

  ngOnInit() {
    // Check URL to determine initial state
    const path = this.route.snapshot.url[0]?.path;
    if (path === 'register') {
      this.isRightPanelActive = true;
    }
  }

  ngAfterViewInit() {
    this.initFluidAnimation();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize.bind(this));
  }

  togglePanel(isRegister: boolean) {
    this.isRightPanelActive = isRegister;

    // Update URL without reloading
    const url = isRegister ? '/register' : '/login';
    this.location.go(url);
  }

  onLoginSubmit() {
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
      !this.registerDisplayName ||
      !this.registerEmail ||
      !this.registerPassword ||
      !this.registerConfirmPassword
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
          this.toastService.show('Registration successful!', 'success');
          this.router.navigate(['/dashboard']);
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

  // --- Fluid Animation Logic ---

  private initFluidAnimation() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.resizeCanvas();
    this.createParticles();
    this.animate();
  }

  private onResize() {
    this.resizeCanvas();
    this.createParticles();
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (parent) {
      this.width = parent.clientWidth;
      this.height = parent.clientHeight;
      canvas.width = this.width;
      canvas.height = this.height;
    }
  }

  private createParticles() {
    this.particles = [];
    const particleCount = 80;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }
  }

  private animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw connecting lines
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];

      // Update position
      p1.x += p1.vx;
      p1.y += p1.vy;

      // Bounce off walls
      if (p1.x < 0 || p1.x > this.width) p1.vx *= -1;
      if (p1.y < 0 || p1.y > this.height) p1.vy *= -1;

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, ${p1.alpha})`;
      this.ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, ${
            1 - distance / 100
          })`;
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  private hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }
}
