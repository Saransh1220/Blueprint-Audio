import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../services';
import { Role } from '../../models';

@Component({
  selector: 'app-studio',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  readonly Role = Role;

  isMobileNavOpen = signal(false);

  displayName = computed(() => {
    const user = this.currentUser();
    return user?.display_name || user?.name || 'Producer';
  });

  avatarUrl = computed(() => this.currentUser()?.avatar_url || null);

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  navItems = [
    { label: 'Overview', icon: 'fas fa-chart-pie', path: 'overview' },
    { label: 'My Tracks', icon: 'fas fa-music', path: 'tracks' },
    { label: 'Analytics', icon: 'fas fa-chart-line', path: 'analytics' },
    { label: 'Orders', icon: 'fas fa-receipt', path: 'orders' },
  ];

  toggleMobileNav() {
    this.isMobileNavOpen.update((v) => !v);
  }

  closeMobileNav() {
    this.isMobileNavOpen.set(false);
  }
}
