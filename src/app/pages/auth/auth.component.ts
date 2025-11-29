import { Location } from '@angular/common';
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  type OnDestroy,
  type OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { Particle } from '../../models/particle';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit, AfterViewInit, OnDestroy {
  isRightPanelActive = false;

  // Login Form Data
  loginEmail = '';
  loginPassword = '';

  // Register Form Data
  registerUsername = '';
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

  constructor(
    _router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private authService: AuthService,
  ) {}

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
    console.log('Login:', this.loginEmail);
    this.authService.login(this.loginEmail);
  }

  onRegisterSubmit() {
    console.log('Register:', this.registerUsername, this.registerRole);
    this.authService.register({
      username: this.registerUsername,
      email: this.registerEmail,
      role: this.registerRole,
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
        color: `rgba(255, 51, 0, ${Math.random() * 0.5 + 0.1})`, // Red theme color
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
      this.ctx.fillStyle = p1.color;
      this.ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(255, 51, 0, ${1 - distance / 100})`;
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }
}
